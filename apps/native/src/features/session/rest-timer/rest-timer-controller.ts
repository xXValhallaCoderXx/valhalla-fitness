import { resolveRestSeconds } from '@sheetless/domain/session/rest-timer'
import { setDraftId } from '@sheetless/domain/session/set-draft'
import type { MovementSlot } from '@sheetless/domain/session/types/session'
import { IDLE_REST, type RestTimerControls, type RestTimerState } from './rest-timer-context'

type Preferences = { autoStartTimer: boolean; defaultRestSeconds: number }
type Ports = {
  schedule: (endsAt: number, label: string | null, isCurrent: () => boolean) => Promise<string | null>
  cancel: (id: string | null) => Promise<void>
  onChange: (state: RestTimerState) => void
}

/** Screen lifetime only. Generations invalidate schedules still awaiting permission. */
export function createRestTimerController(ports: Ports) {
  let state = IDLE_REST
  let active = false
  let generation = 0
  let notificationId: string | null = null
  let preferences: Preferences = { autoStartTimer: true, defaultRestSeconds: 120 }
  const pending = new Map<string, { slot: MovementSlot; mutationId: string; wasCompleted: boolean }>()
  const publish = (next: RestTimerState) => { state = next; if (active) ports.onChange(next) }
  const cancel = () => {
    generation++
    const id = notificationId
    notificationId = null
    void ports.cancel(id)
  }
  const schedule = (endsAt: number, label: string | null) => {
    cancel()
    const request = generation
    const isCurrent = () => active && generation === request && endsAt > Date.now()
    void ports.schedule(endsAt, label, isCurrent).then(id => {
      if (!isCurrent()) { void ports.cancel(id); return }
      notificationId = id
    }).catch(() => undefined)
  }
  const controls: RestTimerControls = {
    startForSlot(slot, source) {
      if (!active) return
      const seconds = resolveRestSeconds(slot, preferences)
      if (seconds == null) return
      const endsAt = Date.now() + seconds * 1000
      const label = slot.performedMovementName ?? slot.movementName
      schedule(endsAt, label)
      publish({ ...state, endsAt, active: true, label, source: source ?? null })
    },
    trackSave(slot, before, mutationId, completed, setIndex) {
      if (!active) return false
      const source = setDraftId(slot, setIndex)
      const existing = pending.get(source)
      const wasCompleted = existing?.wasCompleted ?? (before?.syncState === 'saving' || before?.syncState === 'syncFailed' ? true : before?.completed !== false)
      if (!completed) controls.dismissForSet(source)
      // Keep the last confirmed completion state through failed edits and Undo too.
      pending.set(source, { slot, mutationId, wasCompleted })
      return completed && !wasCompleted
    },
    confirmSession(session) {
      if (!active) return
      if (session.status !== 'in_progress') { controls.exit(); return }
      for (const movement of session.movements) for (const set of movement.sets) {
        const source = setDraftId(movement, set.setIndex)
        const intent = pending.get(source)
        if (!intent || intent.mutationId !== set.clientMutationId
          || set.syncState === 'saving' || set.syncState === 'syncFailed') continue
        pending.delete(source)
        if (intent.wasCompleted || !set.completed) continue
        publish({ ...state, receipt: { source, movementId: movement.id, setIndex: set.setIndex,
          load: set.actualLoad ?? null, reps: set.actualReps ?? null } })
        controls.startForSlot(intent.slot, source)
      }
    },
    dismissForSet(source) {
      pending.delete(source)
      if (state.source === source) controls.dismiss()
      if (state.receipt?.source === source) publish({ ...state, receipt: null })
    },
    addTime(seconds) {
      if (!active || !state.active || state.endsAt == null) return
      const endsAt = state.endsAt + seconds * 1000
      schedule(endsAt, state.label)
      publish({ ...state, endsAt })
    },
    dismiss() { cancel(); publish({ ...IDLE_REST, receipt: state.receipt }) },
    exit() { pending.clear(); cancel(); publish(IDLE_REST); active = false },
    prime() {},
  }
  return { controls, configure: (next: Preferences) => { preferences = next },
    mount: () => { active = true }, dispose: controls.exit,
    foreground: () => { if (state.endsAt != null && state.endsAt <= Date.now()) controls.dismiss() },
  }
}
