import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '@/state/store'
import { selectToday } from '@/state/selectors'
import { Button, Card, Collapsible, Field, Glyph, IconButton, NumberInput, Segmented, Select, Stepper, TextArea } from '@/components/ui'
import { activeGuardrails, readinessScore, type ReadinessInput } from '@/engine/guardrails'
import { accessorySuggestion, swapCandidates } from '@/engine/accessories'
import { SESSION_LABELS } from '@/engine/program-config'
import { LIFT_LABELS } from '@/engine/types'
import { isDeloadWeek } from '@/engine/schedule'
import { localWeekday, todayLocalISO } from '@/lib/date'
import type { LoggedSet, ReadinessLog, SessionLog } from '@/state/types'
import type { PrescribedSet } from '@/engine/cycle'

interface SetDraft {
  repsDone: number
  rir: number
  done: boolean
}

interface AccessoryDraft {
  slotId: string
  exerciseId: string
  plannedExerciseId: string
  swappedFromId?: string
  weight: number
  sets: { reps: number; rir: number; done: boolean }[]
  notes: string
}

interface TimerState {
  label: string
  secondsLeft: number
  running: boolean
}

function toLogged(s: PrescribedSet, draft: SetDraft): LoggedSet {
  return {
    pct: s.pct,
    prescribedWeight: s.weight,
    targetReps: s.targetReps,
    isTopSet: s.isTopSet,
    isAmrap: s.isAmrap,
    minReps: s.minReps,
    repsDone: draft.repsDone,
    rir: draft.rir,
  }
}

function seedSetDrafts(sets: PrescribedSet[], existing?: LoggedSet[]): SetDraft[] {
  return sets.map((set, index) => {
    const logged = existing?.[index]
    return {
      repsDone: logged?.repsDone ?? set.minReps ?? set.targetReps,
      rir: logged?.rir ?? 2,
      done: Boolean(logged?.repsDone),
    }
  })
}

function RestTimer({
  timer,
  onPause,
  onClear,
}: {
  timer: TimerState
  onPause: () => void
  onClear: () => void
}) {
  const min = Math.floor(timer.secondsLeft / 60)
  const sec = String(timer.secondsLeft % 60).padStart(2, '0')
  return (
    <Card className="mb-4 border-indigo-500/60 bg-indigo-500/10">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Glyph name="timer" className="h-5 w-5 text-indigo-200" />
          <div>
            <p className="text-xs uppercase text-indigo-200">{timer.label}</p>
            <p className="text-2xl font-bold tabular-nums">
              {min}:{sec}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="px-3 py-2" onClick={onPause}>
            {timer.running ? 'Pause' : 'Resume'}
          </Button>
          <IconButton label="clear timer" onClick={onClear}>
            x
          </IconButton>
        </div>
      </div>
    </Card>
  )
}

function PlanProgress({
  state,
  currentSessionType,
}: {
  state: NonNullable<ReturnType<typeof useStore.getState>['state']>
  currentSessionType: string
}) {
  const gymSessions = Object.entries(state.config.schedule)
    .filter(([, session]) => session === 'squat' || session === 'bench' || session === 'deadlift' || session === 'assist')
    .sort(([a], [b]) => Number(a) - Number(b))
  const currentDay = String(localWeekday())
  const sessionIndex = Math.max(
    0,
    gymSessions.findIndex(([day, session]) => day === currentDay && session === currentSessionType),
  )
  const total = gymSessions.length * 4
  const plannedPosition = state.cyclePointer.weekIndex * gymSessions.length + sessionIndex + 1
  const loggedThisCycle = state.sessionLogs.filter(
    (log) =>
      log.cycleIndex === state.cyclePointer.cycleIndex &&
      (log.sessionType === 'squat' || log.sessionType === 'bench' || log.sessionType === 'deadlift' || log.sessionType === 'assist'),
  ).length
  const percent = Math.min(100, Math.round((plannedPosition / total) * 100))

  return (
    <Card className="mb-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold">Plan progress</span>
        <span className="text-slate-400">
          Week {state.cyclePointer.weekIndex + 1}/4 / Gym {plannedPosition}/{total}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-400">
        {loggedThisCycle} gym session{loggedThisCycle === 1 ? '' : 's'} logged this cycle. The fourth day is assistance, not another max-effort lift.
      </p>
    </Card>
  )
}

export function Today() {
  const state = useStore((s) => s.state)!
  const recordSession = useStore((s) => s.recordSession)
  const advanceWeek = useStore((s) => s.advanceWeek)
  const lastProgression = useStore((s) => s.lastProgression)
  const setReadiness = useStore((s) => s.setReadiness)

  const info = useMemo(() => selectToday(state), [state])
  const date = todayLocalISO()
  const existing = state.sessionLogs.find((l) => l.date === date && l.sessionType === info.sessionType)
  const existingReadiness = state.readinessLogs.find((r) => r.date === date)

  const readinessInitial: ReadinessInput = {
    sleepQuality: existingReadiness?.sleepQuality ?? 4,
    motivation: existingReadiness?.motivation ?? 4,
    soreness: existingReadiness?.soreness ?? 2,
    stress: existingReadiness?.stress ?? 2,
    restingHrElevated: existingReadiness?.restingHrElevated ?? false,
  }

  const [mainDrafts, setMainDrafts] = useState(() => seedSetDrafts(info.plan?.mainSets ?? [], existing?.mainSets))
  const [fslDrafts, setFslDrafts] = useState(() => seedSetDrafts(info.plan?.fslSets ?? [], existing?.fslSets))
  const [barFast, setBarFast] = useState(existing?.barSpeedFast ?? true)
  const [benchPain, setBenchPain] = useState(existing?.benchPain ?? 0)
  const [readiness, setReadinessDraft] = useState<ReadinessInput>(readinessInitial)
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [timer, setTimer] = useState<TimerState>({ label: '', secondsLeft: 0, running: false })
  const [justSaved, setJustSaved] = useState(false)

  const accessoryInitial = useMemo(
    () => seedAccessories(state, info.sessionType, existing?.accessories ?? [], benchPain, readinessScore(readiness)),
    [benchPain, existing?.accessories, info.sessionType, readiness, state],
  )
  const [accessories, setAccessories] = useState<AccessoryDraft[]>(accessoryInitial)
  const hasAccessorySession = info.sessionType === 'squat' || info.sessionType === 'bench' || info.sessionType === 'deadlift' || info.sessionType === 'assist'

  useEffect(() => {
    if (!timer.running || timer.secondsLeft <= 0) return
    const id = window.setInterval(() => {
      setTimer((cur) => (cur.secondsLeft <= 1 ? { ...cur, secondsLeft: 0, running: false } : { ...cur, secondsLeft: cur.secondsLeft - 1 }))
    }, 1000)
    return () => window.clearInterval(id)
  }, [timer.running, timer.secondsLeft])

  const isBench = info.lift === 'bench'
  const topIndex = info.plan?.mainSets.findIndex((s) => s.isTopSet) ?? -1
  const topSet = topIndex >= 0 ? info.plan?.mainSets[topIndex] : undefined
  const topDraft = topIndex >= 0 ? mainDrafts[topIndex] : undefined
  const missedTopSet = Boolean(topSet && topDraft && topDraft.repsDone < (topSet.minReps ?? topSet.targetReps))
  const fslStruggled = Boolean(
    info.plan?.fslSets.some((set, index) => {
      const draft = fslDrafts[index]
      return draft?.done && (draft.repsDone < set.targetReps || draft.rir <= 1)
    }),
  )
  const guardrails = activeGuardrails({
    readiness,
    benchPain: isBench ? benchPain : 0,
    barSpeedFast: barFast,
    missedTopSet,
    fslStruggled,
  })
  const score = readinessScore(readiness)

  function startRest(seconds: number, label: string) {
    if (!state.restTimerSettings.enabled) return
    setTimer({ label, secondsLeft: seconds, running: true })
  }

  function updateMain(index: number, patch: Partial<SetDraft>) {
    setMainDrafts((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function updateFsl(index: number, patch: Partial<SetDraft>) {
    setFslDrafts((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function updateAccessory(index: number, patch: Partial<AccessoryDraft>) {
    setAccessories((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function finish() {
    if (!info.plan && !hasAccessorySession) return
    const readinessEntry: ReadinessLog = { date, ...readiness }
    setReadiness(readinessEntry)
    const log: SessionLog = {
      id: existing?.id ?? crypto.randomUUID(),
      date,
      cycleIndex: info.cycleIndex,
      weekIndex: info.weekIndex,
      weekName: info.plan?.weekName ?? null,
      lift: info.lift,
      sessionType: info.sessionType,
      mainSets: info.plan ? info.plan.mainSets.map((set, index) => toLogged(set, mainDrafts[index])) : [],
      fslSets: info.plan ? info.plan.fslSets.map((set, index) => toLogged(set, fslDrafts[index])) : [],
      accessories: accessories.map((item) => ({
        slotId: item.slotId,
        exerciseId: item.exerciseId,
        plannedExerciseId: item.plannedExerciseId,
        swappedFromId: item.swappedFromId,
        weight: item.weight > 0 ? item.weight : undefined,
        sets: item.sets,
        notes: item.notes.trim() || undefined,
      })),
      barSpeedFast: barFast,
      benchPain: isBench ? benchPain : undefined,
      readinessScore: score,
      notes: notes.trim() || undefined,
    }
    recordSession(log)
    setJustSaved(true)
  }

  const header = (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase text-slate-400">
          Cycle {info.cycleIndex + 1} / {info.weekLabel}
        </p>
        <h1 className="text-2xl font-bold">
          {info.lift ? LIFT_LABELS[info.lift] : SESSION_LABELS[info.sessionType]}
        </h1>
        <p className="mt-1 text-sm text-slate-400">Readiness {score}/5</p>
      </div>
      <Link to="/settings">
        <IconButton label="settings">
          <Glyph name="settings" />
        </IconButton>
      </Link>
    </div>
  )

  if (!info.plan && !hasAccessorySession) {
    return (
      <div>
        {header}
        <PlanProgress state={state} currentSessionType={info.sessionType} />
        <Card>
          <p className="text-slate-200">{SESSION_LABELS[info.sessionType]}</p>
          <p className="mt-2 text-sm text-slate-400">No barbell session scheduled today. Keep the easy work easy.</p>
          <Link to="/mobility">
            <Button variant="subtle" className="mt-4 w-full">
              Mobility and prehab
            </Button>
          </Link>
        </Card>
        <WeekControls infoWeekIndex={info.weekIndex} advanceWeek={advanceWeek} lastProgression={lastProgression} />
      </div>
    )
  }

  return (
    <div>
      {header}
      <PlanProgress state={state} currentSessionType={info.sessionType} />
      {timer.secondsLeft > 0 && (
        <RestTimer
          timer={timer}
          onPause={() => setTimer((cur) => ({ ...cur, running: !cur.running }))}
          onClear={() => setTimer({ label: '', secondsLeft: 0, running: false })}
        />
      )}

      <section className="mb-4 space-y-2">
        {guardrails.map((guardrail) => (
          <div
            key={`${guardrail.title}-${guardrail.action}`}
            className={`rounded-lg border px-3 py-2 ${
              guardrail.severity === 'danger'
                ? 'border-red-500/70 bg-red-500/10 text-red-100'
                : guardrail.severity === 'warning'
                  ? 'border-amber-500/70 bg-amber-500/10 text-amber-100'
                  : 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100'
            }`}
          >
            <p className="text-sm">
              <span className="font-semibold">{guardrail.title}:</span> {guardrail.message}
            </p>
          </div>
        ))}
      </section>

      <Collapsible title="Readiness" summary={`Sleep ${readiness.sleepQuality} / Drive ${readiness.motivation} / Score ${score}/5`} className="mb-4">
        <div className="grid grid-cols-2 gap-3">
          <ReadinessStepper label="Sleep" value={readiness.sleepQuality} onChange={(sleepQuality) => setReadinessDraft((r) => ({ ...r, sleepQuality }))} />
          <ReadinessStepper label="Drive" value={readiness.motivation} onChange={(motivation) => setReadinessDraft((r) => ({ ...r, motivation }))} />
          <ReadinessStepper label="Soreness" value={readiness.soreness} onChange={(soreness) => setReadinessDraft((r) => ({ ...r, soreness }))} />
          <ReadinessStepper label="Stress" value={readiness.stress} onChange={(stress) => setReadinessDraft((r) => ({ ...r, stress }))} />
        </div>
      </Collapsible>

      {info.plan && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase text-slate-400">Main work</h2>
          {info.plan.mainSets.map((set, index) => (
            <SetRow
              key={`main-${index}`}
              set={set}
              draft={mainDrafts[index]}
              label={set.isTopSet ? 'Top set' : `Set ${index + 1}`}
              restSeconds={state.restTimerSettings.mainLiftSeconds}
              onChange={(patch) => updateMain(index, patch)}
              onDone={() => startRest(state.restTimerSettings.mainLiftSeconds, 'Main lift rest')}
            />
          ))}
        </section>
      )}

      {info.plan && info.plan.fslSets.length > 0 && (
        <section className="mt-5 space-y-2">
          <h2 className="text-sm font-semibold uppercase text-slate-400">FSL back-off</h2>
          {info.plan.fslSets.map((set, index) => (
            <SetRow
              key={`fsl-${index}`}
              set={set}
              draft={fslDrafts[index]}
              label={`FSL ${index + 1}`}
              restSeconds={state.restTimerSettings.mainLiftSeconds}
              onChange={(patch) => updateFsl(index, patch)}
              onDone={() => startRest(state.restTimerSettings.mainLiftSeconds, 'FSL rest')}
            />
          ))}
        </section>
      )}

      {(info.plan || isBench) && (
        <Card className="mt-4 space-y-4">
          {info.plan && (
            <div>
              <span className="mb-2 block text-xs font-medium uppercase text-slate-400">Bar speed</span>
              <Segmented
                value={barFast ? 'fast' : 'slow'}
                onChange={(v) => setBarFast(v === 'fast')}
                options={[
                  { label: 'Fast', value: 'fast' },
                  { label: 'Slow / grind', value: 'slow' },
                ]}
              />
            </div>
          )}
          {isBench && (
          <div>
            <span className="mb-2 block text-xs font-medium uppercase text-slate-400">Shoulder pain</span>
            <Stepper value={benchPain} min={0} max={10} onChange={setBenchPain} />
          </div>
          )}
        </Card>
      )}

      <section className="mt-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase text-slate-400">Accessories</h2>
          <Link to="/accessories" className="text-sm text-indigo-300">
            Edit pools
          </Link>
        </div>
        {accessories.map((item, index) => (
          <AccessoryCard
            key={item.slotId}
            item={item}
            state={state}
            benchPain={isBench ? benchPain : 0}
            readiness={score}
            onChange={(patch) => updateAccessory(index, patch)}
            onStartRest={() => startRest(state.accessorySlots[item.slotId]?.restSeconds ?? state.restTimerSettings.accessorySeconds, 'Accessory rest')}
          />
        ))}
      </section>

      <Card className="mt-4">
        <Field label="Session notes">
          <TextArea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Technique, pain, fatigue, anything useful..." />
        </Field>
      </Card>

      <Button className="mt-5 w-full" onClick={finish}>
        {justSaved || existing ? 'Update session' : 'Finish session'}
      </Button>
      {justSaved && <p className="mt-2 text-center text-sm text-emerald-400">Logged and progression updated.</p>}

      <WeekControls infoWeekIndex={info.weekIndex} advanceWeek={advanceWeek} lastProgression={lastProgression} />
    </div>
  )
}

function seedAccessories(
  state: ReturnType<typeof useStore.getState>['state'],
  sessionType: string,
  existing: SessionLog['accessories'],
  benchPain: number,
  readiness: number,
): AccessoryDraft[] {
  if (!state || (sessionType !== 'squat' && sessionType !== 'bench' && sessionType !== 'deadlift' && sessionType !== 'assist')) return []
  const template = state.sessionTemplates[sessionType]
  return template.accessorySlotIds.map((slotId) => {
    const slot = state.accessorySlots[slotId]
    const logged = existing.find((item) => item.slotId === slotId)
    const loggedSets = logged?.sets ?? []
    const selectedId = logged?.exerciseId ?? slot.plannedExerciseId
    const candidates = swapCandidates(slot, state.exerciseLibrary, {
      benchPain,
      readinessScore: readiness,
      preferLowFatigue: readiness <= 2,
    })
    const fallback = candidates.find((candidate) => candidate.eligible)?.exercise.id ?? selectedId
    const exerciseId = state.exerciseLibrary[selectedId] ? selectedId : fallback
    return {
      slotId,
      exerciseId,
      plannedExerciseId: logged?.plannedExerciseId ?? slot.plannedExerciseId,
      swappedFromId: logged?.swappedFromId,
      weight: logged?.weight ?? state.accessoryProgress[exerciseId]?.currentWeight ?? 0,
      sets:
        loggedSets.length > 0
          ? loggedSets.map((set) => ({ reps: set.reps, rir: set.rir ?? 2, done: set.done ?? true }))
          : Array.from({ length: slot.sets }, () => ({ reps: slot.repLow, rir: 2, done: false })),
      notes: logged?.notes ?? '',
    }
  })
}

function ReadinessStepper({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <span className="mb-1 block text-xs uppercase text-slate-500">{label}</span>
      <Stepper value={value} min={1} max={5} onChange={onChange} />
    </div>
  )
}

function SetRow({
  set,
  draft,
  label,
  restSeconds,
  onChange,
  onDone,
}: {
  set: PrescribedSet
  draft: SetDraft
  label: string
  restSeconds: number
  onChange: (patch: Partial<SetDraft>) => void
  onDone: () => void
}) {
  const [open, setOpen] = useState(set.isTopSet)
  const status = draft.done ? 'Done' : `${draft.repsDone} reps / RIR ${draft.rir}`
  return (
    <Card className={`p-0 ${set.isTopSet ? 'border-indigo-500/70 bg-indigo-500/10' : ''}`}>
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <div className="min-w-0">
          <p className="text-xs uppercase text-slate-500">{label}</p>
          <p className="truncate text-lg font-bold tabular-nums">
            {set.weight} kg <span className="text-slate-400">x {set.targetReps}{set.isAmrap ? '+' : ''}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-md px-2 py-1 text-xs ${draft.done ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-800 text-slate-400'}`}>
            {status}
          </span>
          <span className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-400">{Math.round(set.pct * 100)}%</span>
          <Glyph name={open ? 'chevron-up' : 'chevron-down'} className="h-4 w-4 text-slate-400" />
        </div>
      </button>
      {open && (
        <div className="border-t border-slate-800 px-4 py-4">
          {set.note && <p className="mb-3 text-xs text-slate-400">{set.note}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="mb-1 block text-xs uppercase text-slate-500">Reps</span>
              <Stepper value={draft.repsDone} min={0} max={30} onChange={(repsDone) => onChange({ repsDone })} />
            </div>
            <div>
              <span className="mb-1 block text-xs uppercase text-slate-500">RIR</span>
              <Segmented
                value={draft.rir}
                onChange={(rir) => onChange({ rir })}
                options={[0, 1, 2, 3, 4].map((n) => ({ label: String(n), value: n }))}
              />
            </div>
          </div>
          <Button
            variant={draft.done ? 'success' : 'subtle'}
            className="mt-3 w-full py-2"
            onClick={() => {
              onChange({ done: !draft.done })
              if (!draft.done) onDone()
            }}
          >
            {draft.done ? `Done - rest ${Math.round(restSeconds / 60)}m` : 'Mark done'}
          </Button>
        </div>
      )}
    </Card>
  )
}

function AccessoryCard({
  item,
  state,
  benchPain,
  readiness,
  onChange,
  onStartRest,
}: {
  item: AccessoryDraft
  state: NonNullable<ReturnType<typeof useStore.getState>['state']>
  benchPain: number
  readiness: number
  onChange: (patch: Partial<AccessoryDraft>) => void
  onStartRest: () => void
}) {
  const slot = state.accessorySlots[item.slotId]
  const exercise = state.exerciseLibrary[item.exerciseId]
  const candidates = swapCandidates(slot, state.exerciseLibrary, {
    benchPain,
    readinessScore: readiness,
    preferLowFatigue: readiness <= 2,
  })
  const suggestion = item.weight > 0 ? accessorySuggestion(item.weight, slot.repHigh, item.sets) : null
  const completed = item.sets.filter((set) => set.done).length

  return (
    <Collapsible
      title={exercise?.name ?? item.exerciseId}
      summary={`${slot.title} / ${completed}/${item.sets.length} sets / ${item.weight || '-'} kg`}
      className={completed === item.sets.length ? 'border-emerald-500/40' : ''}
    >
      {item.exerciseId !== item.plannedExerciseId && <p className="mb-3 text-xs text-indigo-200">Swapped from planned movement.</p>}
      <Button
        variant={completed === item.sets.length ? 'success' : 'subtle'}
        className="mb-3 w-full py-2"
        onClick={() => {
          const markDone = completed !== item.sets.length
          onChange({ sets: item.sets.map((set) => ({ ...set, done: markDone })) })
          if (markDone) onStartRest()
        }}
      >
        {completed === item.sets.length ? 'Accessory done' : 'Mark accessory done'}
      </Button>
      <Field label="Movement">
        <Select
          value={item.exerciseId}
          onChange={(e) => {
            const exerciseId = e.target.value
            onChange({
              exerciseId,
              swappedFromId: exerciseId === item.plannedExerciseId ? undefined : item.plannedExerciseId,
              weight: state.accessoryProgress[exerciseId]?.currentWeight ?? 0,
            })
          }}
        >
          {candidates.map((candidate) => (
            <option key={candidate.exercise.id} value={candidate.exercise.id} disabled={!candidate.eligible && candidate.exercise.id !== item.exerciseId}>
              {candidate.exercise.name}
              {!candidate.eligible ? ' - gated' : ''}
            </option>
          ))}
        </Select>
      </Field>

      <div className="mt-3">
        <Field label="Working weight">
          <NumberInput value={item.weight} min={0} onChange={(weight) => onChange({ weight })} suffix="kg" />
        </Field>
      </div>

      <div className="mt-3 space-y-2">
        {item.sets.map((set, index) => (
          <div key={index} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg bg-slate-950 p-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="mb-1 block text-xs uppercase text-slate-500">Set {index + 1}</span>
                <Stepper
                  value={set.reps}
                  min={0}
                  max={40}
                  onChange={(reps) =>
                    onChange({ sets: item.sets.map((s, i) => (i === index ? { ...s, reps } : s)) })
                  }
                />
              </div>
              <div>
                <span className="mb-1 block text-xs uppercase text-slate-500">RIR</span>
                <Segmented
                  value={set.rir}
                  onChange={(rir) =>
                    onChange({ sets: item.sets.map((s, i) => (i === index ? { ...s, rir } : s)) })
                  }
                  options={[0, 1, 2, 3, 4].map((n) => ({ label: String(n), value: n }))}
                />
              </div>
            </div>
            <IconButton
              label={set.done ? 'mark set incomplete' : 'mark set complete'}
              className={set.done ? 'border-emerald-500 bg-emerald-500 text-white' : ''}
              onClick={() => {
                onChange({ sets: item.sets.map((s, i) => (i === index ? { ...s, done: !s.done } : s)) })
                if (!set.done) onStartRest()
              }}
            >
              <Glyph name="check" />
            </IconButton>
          </div>
        ))}
      </div>

      {suggestion && <p className="mt-3 text-sm text-emerald-300">{suggestion.reason}</p>}

      <div className="mt-3">
        <Field label="Exercise notes">
          <TextArea rows={2} value={item.notes} onChange={(e) => onChange({ notes: e.target.value })} placeholder={exercise?.note ?? 'Cues, setup, pain, substitution reason...'} />
        </Field>
      </div>
    </Collapsible>
  )
}

function WeekControls({
  infoWeekIndex,
  advanceWeek,
  lastProgression,
}: {
  infoWeekIndex: number
  advanceWeek: (fullyRecovered?: boolean) => void
  lastProgression: { lift: string; fromTM: number; toTM: number; band: string; reason: string }[] | null
}) {
  const onDeload = isDeloadWeek(infoWeekIndex)
  return (
    <div className="mt-8 border-t border-slate-800 pt-4">
      <Button variant="ghost" className="w-full" onClick={() => advanceWeek(true)}>
        {onDeload ? 'Finish cycle and evaluate progression' : 'Advance to next week'}
      </Button>
      {lastProgression && lastProgression.length > 0 && (
        <Card className="mt-4">
          <h3 className="mb-2 font-semibold">New cycle TM updates</h3>
          <ul className="space-y-2 text-sm">
            {lastProgression.map((p) => (
              <li key={p.lift}>
                <span className="font-semibold">{p.lift}</span>:{' '}
                <span className="tabular-nums">
                  {p.fromTM} to {p.toTM} kg
                </span>{' '}
                <span className="text-slate-400">({p.band})</span>
                <p className="text-xs text-slate-500">{p.reason}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
