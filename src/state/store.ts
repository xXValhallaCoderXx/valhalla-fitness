import { create } from 'zustand'
import type {
  AppState,
  MetricEntry,
  PhaseId,
  ReadinessLog,
  RestTimerSettings,
  SessionLog,
  TmHistoryEntry,
} from './types'
import { createInitialState, parseState } from './schema'
import { chooseSyncDirection } from './sync'
import { clearState, loadState, pushBackup, saveState } from './persistence'
import { nowISO, todayLocalISO } from '@/lib/date'
import type { LiftId, SessionType } from '@/engine/types'
import { LIFT_IDS } from '@/engine/types'
import type { AccessorySlotSpec, ExerciseSpec } from '@/engine/program-config'
import { trainingMax } from '@/engine/math'
import { advanceWeek as advancePointer } from '@/engine/schedule'
import { accessorySuggestion } from '@/engine/accessories'
import { evaluateCycle, type TopSetResult } from '@/engine/progression'

export interface TopSetInput {
  weight: number
  reps: number
  rir: number
}

export interface OnboardInput {
  squat: TopSetInput
  bench: TopSetInput
  deadlift: TopSetInput
}

export interface ProgressionSummary {
  lift: LiftId
  band: string
  fromTM: number
  toTM: number
  reason: string
}

type SyncResult = 'pushed' | 'pulled' | 'noop' | 'error'

interface Store {
  status: 'loading' | 'ready'
  state: AppState | null
  lastProgression: ProgressionSummary[] | null

  init: () => Promise<void>
  completeOnboarding: (input: OnboardInput) => void
  recordSession: (log: SessionLog) => void
  advanceWeek: (fullyRecovered?: boolean) => void
  setTrainingMax: (lift: LiftId, tm: number) => void
  setStartDate: (startDate: string) => void
  setPhase: (phase: PhaseId) => void
  setScheduleDay: (day: string, sessionType: SessionType) => void
  updateRestTimers: (settings: Partial<RestTimerSettings>) => void
  updateAccessorySlot: (slotId: string, patch: Partial<AccessorySlotSpec>) => void
  addCustomExercise: (exercise: ExerciseSpec, slotId?: string) => void
  setReadiness: (entry: ReadinessLog) => void
  toggleMobilityItem: (date: string, itemId: string) => void
  addMetric: (entry: MetricEntry) => void
  loginSync: (password: string) => Promise<boolean>
  pushSync: () => Promise<boolean>
  pullSync: () => Promise<boolean>
  syncNow: () => Promise<SyncResult>
  exportJSON: () => string
  importJSON: (json: string) => boolean
  resetAll: () => Promise<void>
}

let persistTimer: ReturnType<typeof setTimeout> | null = null

function schedulePersist(state: AppState) {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    void saveState(state)
    void pushBackup(state)
  }, 600)
}

function syncMeta(state: AppState, patch: Partial<AppState['syncMeta']>): AppState {
  return { ...state, syncMeta: { ...state.syncMeta, ...patch } }
}

async function readRemoteState(): Promise<AppState | null> {
  const res = await fetch('/api/state', { method: 'GET' })
  if (!res.ok) return null
  const data = (await res.json()) as { state?: unknown }
  return data.state ? parseState(data.state) : null
}

async function writeRemoteState(state: AppState): Promise<boolean> {
  const res = await fetch('/api/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  })
  return res.ok
}

export const useStore = create<Store>((set, get) => {
  function commit(next: AppState, stampUpdatedAt = true) {
    const stamped = stampUpdatedAt ? { ...next, updatedAt: nowISO() } : next
    set({ state: stamped })
    schedulePersist(stamped)
  }

  function update(mutator: (s: AppState) => AppState, stampUpdatedAt = true) {
    const cur = get().state
    if (!cur) return
    commit(mutator(cur), stampUpdatedAt)
  }

  return {
    status: 'loading',
    state: null,
    lastProgression: null,

    async init() {
      const loaded = await loadState()
      set({ state: loaded ?? createInitialState(), status: 'ready' })
    },

    completeOnboarding(input) {
      update((s) => {
        const lifts = { ...s.lifts }
        const today = todayLocalISO()
        for (const lift of LIFT_IDS) {
          const inp = input[lift]
          const tm = trainingMax(inp.weight, inp.reps, inp.rir, s.config.tmPct[lift], s.config.roundingKg)
          const seed: TmHistoryEntry = {
            date: today,
            cycleIndex: 0,
            fromTM: 0,
            toTM: tm,
            band: 'seed',
            reason: `Seeded from ${inp.weight}kg x ${inp.reps} @ RIR ${inp.rir}.`,
          }
          lifts[lift] = { trainingMax: tm, history: [seed], consecutiveHoldOrReset: 0 }
        }
        return {
          ...s,
          lifts,
          onboarded: true,
          config: { ...s.config, startDate: today },
          cyclePointer: { cycleIndex: 0, weekIndex: 0 },
        }
      })
    },

    recordSession(log) {
      update((s) => {
        const rest = s.sessionLogs.filter(
          (l) => !(l.date === log.date && l.sessionType === log.sessionType),
        )
        const accessoryProgress = { ...s.accessoryProgress }
        for (const accessory of log.accessories) {
          const slot = s.accessorySlots[accessory.slotId]
          const weight = accessory.weight ?? accessoryProgress[accessory.exerciseId]?.currentWeight ?? 0
          if (!slot || weight <= 0) continue
          const completedSets = accessory.sets.filter((set) => set.done)
          const suggestion =
            completedSets.length >= slot.sets ? accessorySuggestion(weight, slot.repHigh, completedSets) : null
          accessoryProgress[accessory.exerciseId] = {
            exerciseId: accessory.exerciseId,
            currentWeight: suggestion?.newWeight ?? weight,
            lastUpdated: log.date,
          }
        }
        return { ...s, sessionLogs: [...rest, log], accessoryProgress }
      })
    },

    advanceWeek(fullyRecovered = true) {
      const cur = get().state
      if (!cur) return
      const { cycleIndex, weekIndex } = cur.cyclePointer
      const leavingDeload = weekIndex === 3
      const summaries: ProgressionSummary[] = []

      update((s) => {
        let lifts = s.lifts
        if (leavingDeload) {
          lifts = { ...s.lifts }
          for (const lift of LIFT_IDS) {
            const ls = lifts[lift]
            if (ls.trainingMax == null) continue
            const topSets: TopSetResult[] = s.sessionLogs
              .filter((l) => l.cycleIndex === cycleIndex && l.lift === lift)
              .flatMap((l) =>
                l.mainSets
                  .filter((ms) => ms.isTopSet && ms.repsDone != null && ms.minReps != null)
                  .map((ms) => ({
                    weekIndex: l.weekIndex,
                    minReps: ms.minReps as number,
                    repsDone: ms.repsDone as number,
                    rir: ms.rir ?? 0,
                    barFast: l.barSpeedFast,
                  })),
              )
            const benchPainMax =
              lift === 'bench'
                ? s.sessionLogs
                    .filter((l) => l.cycleIndex === cycleIndex && l.lift === 'bench')
                    .reduce((m, l) => Math.max(m, l.benchPain ?? 0), 0)
                : 0

            const evalResult = evaluateCycle({
              lift,
              currentTM: ls.trainingMax,
              topSets,
              benchPainMax,
              fullyRecovered,
              consecutiveHoldOrReset: ls.consecutiveHoldOrReset,
              rounding: s.config.roundingKg,
            })
            const entry: TmHistoryEntry = {
              date: todayLocalISO(),
              cycleIndex: cycleIndex + 1,
              fromTM: ls.trainingMax,
              toTM: evalResult.nextTM,
              band: evalResult.band,
              reason: evalResult.reason,
            }
            lifts[lift] = {
              trainingMax: evalResult.nextTM,
              history: [...ls.history, entry],
              consecutiveHoldOrReset: evalResult.nextConsecutiveHoldOrReset,
            }
            summaries.push({
              lift,
              band: evalResult.band,
              fromTM: ls.trainingMax,
              toTM: evalResult.nextTM,
              reason: evalResult.reason,
            })
          }
        }
        return { ...s, lifts, cyclePointer: advancePointer(cycleIndex, weekIndex) }
      })

      set({ lastProgression: leavingDeload ? summaries : null })
    },

    setTrainingMax(lift, tm) {
      update((s) => {
        const ls = s.lifts[lift]
        const entry: TmHistoryEntry = {
          date: todayLocalISO(),
          cycleIndex: s.cyclePointer.cycleIndex,
          fromTM: ls.trainingMax ?? 0,
          toTM: tm,
          band: 'seed',
          reason: 'Manual adjustment.',
        }
        return {
          ...s,
          lifts: { ...s.lifts, [lift]: { ...ls, trainingMax: tm, history: [...ls.history, entry] } },
        }
      })
    },

    setStartDate(startDate) {
      update((s) => ({ ...s, config: { ...s.config, startDate } }))
    },

    setPhase(phase) {
      update((s) => ({ ...s, config: { ...s.config, phase } }))
    },

    setScheduleDay(day, sessionType) {
      update((s) => ({
        ...s,
        config: { ...s.config, schedule: { ...s.config.schedule, [day]: sessionType } },
      }))
    },

    updateRestTimers(settings) {
      update((s) => ({ ...s, restTimerSettings: { ...s.restTimerSettings, ...settings } }))
    },

    updateAccessorySlot(slotId, patch) {
      update((s) => {
        const existing = s.accessorySlots[slotId]
        if (!existing) return s
        return { ...s, accessorySlots: { ...s.accessorySlots, [slotId]: { ...existing, ...patch } } }
      })
    },

    addCustomExercise(exercise, slotId) {
      update((s) => {
        const nextSlots = { ...s.accessorySlots }
        if (slotId && nextSlots[slotId] && !nextSlots[slotId].swapPool.includes(exercise.id)) {
          nextSlots[slotId] = {
            ...nextSlots[slotId],
            swapPool: [...nextSlots[slotId].swapPool, exercise.id],
          }
        }
        return {
          ...s,
          exerciseLibrary: { ...s.exerciseLibrary, [exercise.id]: { ...exercise, custom: true } },
          accessorySlots: nextSlots,
        }
      })
    },

    setReadiness(entry) {
      update((s) => {
        const rest = s.readinessLogs.filter((r) => r.date !== entry.date)
        return { ...s, readinessLogs: [...rest, entry].sort((a, b) => a.date.localeCompare(b.date)) }
      })
    },

    toggleMobilityItem(date, itemId) {
      update((s) => {
        const done = new Set(s.mobility.log[date] ?? [])
        if (done.has(itemId)) done.delete(itemId)
        else done.add(itemId)
        return { ...s, mobility: { ...s.mobility, log: { ...s.mobility.log, [date]: [...done] } } }
      })
    },

    addMetric(entry) {
      update((s) => {
        const rest = s.metrics.filter((m) => m.date !== entry.date)
        return { ...s, metrics: [...rest, entry].sort((a, b) => a.date.localeCompare(b.date)) }
      })
    },

    async loginSync(password) {
      const cur = get().state
      if (!cur) return false
      commit(syncMeta(cur, { enabled: true, status: 'pulling', lastError: undefined }), false)
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        })
        const ok = res.ok
        const next = get().state
        if (next) {
          commit(
            syncMeta(next, {
              enabled: ok,
              authenticated: ok,
              status: ok ? 'ready' : 'error',
              lastError: ok ? undefined : 'Password rejected.',
            }),
            false,
          )
        }
        return ok
      } catch {
        const next = get().state
        if (next) commit(syncMeta(next, { status: 'error', lastError: 'Login request failed.' }), false)
        return false
      }
    },

    async pushSync() {
      const cur = get().state
      if (!cur) return false
      commit(syncMeta(cur, { status: 'pushing', lastError: undefined }), false)
      try {
        const stateToPush = get().state
        if (!stateToPush) return false
        const ok = await writeRemoteState(syncMeta(stateToPush, { status: 'ready' }))
        const next = get().state
        if (next) {
          commit(
            syncMeta(next, {
              status: ok ? 'ready' : 'error',
              authenticated: ok ? true : next.syncMeta.authenticated,
              lastPushedAt: ok ? nowISO() : next.syncMeta.lastPushedAt,
              serverUpdatedAt: ok ? next.updatedAt : next.syncMeta.serverUpdatedAt,
              lastError: ok ? undefined : 'Push failed.',
            }),
            false,
          )
        }
        return ok
      } catch {
        const next = get().state
        if (next) commit(syncMeta(next, { status: 'error', lastError: 'Push request failed.' }), false)
        return false
      }
    },

    async pullSync() {
      const cur = get().state
      if (!cur) return false
      commit(syncMeta(cur, { status: 'pulling', lastError: undefined }), false)
      try {
        const remote = await readRemoteState()
        const next = get().state
        if (!remote || !next) {
          if (next) commit(syncMeta(next, { status: 'error', lastError: 'No remote state found.' }), false)
          return false
        }
        commit(
          syncMeta(remote, {
            enabled: true,
            authenticated: true,
            status: 'ready',
            lastPulledAt: nowISO(),
            serverUpdatedAt: remote.updatedAt,
          }),
          false,
        )
        return true
      } catch {
        const next = get().state
        if (next) commit(syncMeta(next, { status: 'error', lastError: 'Pull request failed.' }), false)
        return false
      }
    },

    async syncNow() {
      const cur = get().state
      if (!cur) return 'error'
      commit(syncMeta(cur, { status: 'pulling', lastError: undefined }), false)
      try {
        const remote = await readRemoteState()
        const local = get().state
        if (!local) return 'error'
        const decision = chooseSyncDirection(local.updatedAt, remote?.updatedAt)
        if (decision === 'push') return (await get().pushSync()) ? 'pushed' : 'error'
        if (remote && decision === 'pull') {
          commit(
            syncMeta(remote, {
              enabled: true,
              authenticated: true,
              status: 'ready',
              lastPulledAt: nowISO(),
              serverUpdatedAt: remote.updatedAt,
            }),
            false,
          )
          return 'pulled'
        }
        commit(syncMeta(local, { status: 'ready', serverUpdatedAt: remote?.updatedAt }), false)
        return 'noop'
      } catch {
        const next = get().state
        if (next) commit(syncMeta(next, { status: 'error', lastError: 'Sync request failed.' }), false)
        return 'error'
      }
    },

    exportJSON() {
      return JSON.stringify(get().state, null, 2)
    },

    importJSON(json) {
      try {
        const parsed = parseState(JSON.parse(json))
        if (!parsed) return false
        commit(parsed)
        return true
      } catch {
        return false
      }
    },

    async resetAll() {
      await clearState()
      const fresh = createInitialState()
      set({ state: fresh, lastProgression: null })
      schedulePersist(fresh)
    },
  }
})
