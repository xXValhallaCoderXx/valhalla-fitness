import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MovementSlot, WorkoutSession } from '@sheetless/domain/session/types/session'
import { setDraftId } from '@sheetless/domain/session/set-draft'
import { createRestTimerController } from '../src/features/session/rest-timer/rest-timer-controller'
const movement: MovementSlot = { id: 'exercise', movementId: 'bench', movementName: 'Bench', role: 'main', orderIndex: 0,
  targetSummary: '', sets: [{ id: 'set-1', setIndex: 1, completed: false }] }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes }); return { promise, resolve } }
function setup() {
  const schedule = vi.fn<Parameters<typeof createRestTimerController>[0]['schedule']>().mockResolvedValue('notification')
  const cancel = vi.fn().mockResolvedValue(undefined)
  const onChange = vi.fn()
  const cue = vi.fn()
  const timer = createRestTimerController({ schedule, cancel, onChange, cue })
  timer.mount()
  return { timer, schedule, cancel, onChange, cue, controls: timer.controls }
}
afterEach(() => vi.useRealTimers())
describe('rest scheduling ownership', () => {
  it.each(['skip', 'exit', 'unmount', 'expire'] as const)('cancels a late ID after %s and invalidates its permission continuation', async action => {
    vi.useFakeTimers()
    const { timer, controls, schedule, cancel } = setup()
    const pending = deferred<string>()
    schedule.mockReturnValue(pending.promise)
    controls.startForSlot(movement)
    expect(schedule.mock.calls[0][2]()).toBe(true)
    if (action === 'skip') controls.dismiss()
    if (action === 'exit') controls.exit()
    if (action === 'unmount') timer.dispose()
    if (action === 'expire') { vi.advanceTimersByTime(180000); timer.foreground() }
    expect(schedule.mock.calls[0][2]()).toBe(false)
    pending.resolve('late')
    await Promise.resolve()
    expect(cancel).toHaveBeenCalledWith('late')
  })
  it('rapid extensions cannot overwrite the newest schedule', async () => {
    const { controls, schedule, cancel } = setup()
    const first = deferred<string>(), second = deferred<string>(), third = deferred<string>()
    schedule.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise).mockReturnValueOnce(third.promise)
    controls.startForSlot(movement)
    controls.addTime(15)
    controls.addTime(15)
    third.resolve('newest'); await Promise.resolve()
    first.resolve('old'); second.resolve('middle'); await Promise.resolve()
    expect(cancel).toHaveBeenCalledWith('old')
    expect(cancel).toHaveBeenCalledWith('middle')
    expect(cancel).not.toHaveBeenCalledWith('newest')
    controls.dismiss()
    expect(cancel).toHaveBeenCalledWith('newest')
  })
  it('starts once on confirmation after a lost response; correction and undo do not restart', () => {
    const { controls, schedule, onChange } = setup()
    const set = movement.sets[0]
    const saved = { ...set, completed: true, actualLoad: 80, actualReps: 5, clientMutationId: 'intent', syncState: 'synced' as const }
    const session = { status: 'in_progress', movements: [{ ...movement, sets: [saved] }] } as WorkoutSession
    controls.trackSave(movement, set, 'intent', true, 1)
    controls.trackSave(movement, { ...saved, syncState: 'syncFailed' }, 'intent', true, 1)
    controls.confirmSession(session)
    controls.confirmSession(session)
    expect(schedule).toHaveBeenCalledTimes(1)
    controls.trackSave(movement, saved, 'correction', true, 1)
    controls.confirmSession({ ...session, movements: [{ ...movement, sets: [{ ...saved, clientMutationId: 'correction' }] }] })
    expect(schedule).toHaveBeenCalledTimes(1)
    controls.trackSave(movement, saved, 'undo', false, 1)
    expect(onChange.mock.lastCall?.[0].active).toBe(false)
    controls.confirmSession({ ...session, movements: [{ ...movement, sets: [{ ...saved, completed: false, clientMutationId: 'undo' }] }] })
    controls.trackSave(movement, set, 'relog', true, 1)
    controls.confirmSession({ ...session, movements: [{ ...movement, sets: [{ ...saved, clientMutationId: 'relog' }] }] })
    expect(schedule).toHaveBeenCalledTimes(2)
  })
  it('Undo stops only the source timer and exit prevents a pending completion from starting rest', () => {
    const { controls, onChange, schedule } = setup()
    controls.startForSlot(movement, setDraftId(movement, 2))
    controls.dismissForSet(setDraftId(movement, 1))
    expect(onChange.mock.lastCall?.[0].active).toBe(true)
    controls.trackSave(movement, movement.sets[0], 'pending', true, 1)
    controls.exit()
    controls.confirmSession({ status: 'in_progress', movements: [{ ...movement, sets: [{ ...movement.sets[0], completed: true, clientMutationId: 'pending' }] }] } as WorkoutSession)
    expect(schedule).toHaveBeenCalledTimes(1)
  })
})

it('owns the clock without a visual presenter, extends the denominator and cues only once', () => {
  vi.useFakeTimers()
  const { timer, controls, onChange, cue } = setup()
  controls.startForSlot(movement)
  expect(onChange.mock.lastCall?.[0]).toMatchObject({ durationSeconds: 180, secondsLeft: 180 })
  vi.advanceTimersByTime(27000)
  timer.tick()
  expect(onChange.mock.lastCall?.[0].secondsLeft).toBe(153)
  controls.addTime(15)
  expect(onChange.mock.lastCall?.[0]).toMatchObject({ durationSeconds: 195, secondsLeft: 168 })
  vi.advanceTimersByTime(168000)
  timer.tick()
  timer.tick()
  expect(cue).toHaveBeenCalledOnce()
  expect(onChange.mock.lastCall?.[0]).toMatchObject({ active: false, durationSeconds: null, secondsLeft: 0 })
})

it('keeps auto-rest disabled and never emits a second foreground cue for a background expiry', () => {
  vi.useFakeTimers()
  const { timer, controls, schedule, cue } = setup()
  timer.configure({ autoStartTimer: false, defaultRestSeconds: 120 })
  controls.startForSlot(movement)
  expect(schedule).not.toHaveBeenCalled()
  timer.configure({ autoStartTimer: true, defaultRestSeconds: 120 })
  controls.startForSlot(movement)
  vi.advanceTimersByTime(180000)
  timer.foreground()
  timer.tick()
  expect(cue).not.toHaveBeenCalled()
})

it('does not mistake an unconfirmed Undo followed by correction for new completed work', () => {
  const { controls, schedule } = setup()
  const completed = { ...movement.sets[0], completed: true, syncState: 'synced' as const }
  controls.trackSave(movement, completed, 'undo', false, 1)
  const failedUndo = { ...completed, completed: false, syncState: 'syncFailed' as const }
  expect(controls.trackSave(movement, failedUndo, 'correct', true, 1)).toBe(false)
  controls.confirmSession({ status: 'in_progress', movements: [{ ...movement, sets: [{ ...completed, clientMutationId: 'correct' }] }] } as WorkoutSession)
  expect(schedule).not.toHaveBeenCalled()
})
