import { describe, expect, it } from 'vitest'
import { buildWorkoutShareModel } from '../src/history/workout-share'
import type { MovementSlot, SetLog, WorkoutSession } from '../src/session/types'

const set = (over: Partial<SetLog> = {}): SetLog => ({ id: 'set', setIndex: 0, completed: true, actualLoad: 80, actualReps: 5, ...over })
const movement = (id: string, sets = [set()], over: Partial<MovementSlot> = {}): MovementSlot => ({
  id, movementId: id, movementName: id, role: 'main', orderIndex: 0, targetSummary: 'private target', sets, ...over,
})
const session = (over: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 's', sessionId: 's', stateVersion: 1, title: 'Upper', programTitle: 'Private programme',
  templateId: 't', weekIndex: 0, weekLabel: '', hardness: null, scheduledDate: '2026-09-05',
  estimatedMinutes: 90, units: 'kg', rounding: 2.5, status: 'completed', movements: [movement('Bench')], ...over,
})

describe('workout share projection', () => {
  it.each(['planned', 'in_progress', 'skipped'] as const)('rejects %s sessions', (status) => {
    expect(buildWorkoutShareModel(session({ status }))).toBeNull()
  })
  it.each([
    { actualReps: null, targetReps: 10 }, { actualReps: 0 }, { actualReps: NaN },
    { actualReps: Infinity }, { completed: false }, { actualLoad: -1 }, { actualLoad: Infinity },
  ])('rejects unusable actual results %j', (over) => {
    expect(buildWorkoutShareModel(session({ movements: [movement('a', [set(over)])] }))).toBeNull()
  })
  it('distinguishes missing load, explicit bodyweight and weighted results in recorded units', () => {
    const model = buildWorkoutShareModel(session({ units: 'lb', movements: [
      movement('a', [set({ actualLoad: null, targetLoad: 100 })]),
      movement('b', [set({ actualLoad: 0, actualReps: 12 })]),
      movement('c', [set({ actualLoad: 82.5 })]),
    ] }))!
    expect(model.exercises.map((row) => row.result)).toEqual(['5 reps', 'Bodyweight × 12', '82.5 lb × 5'])
    expect(model.durationSeconds).toBeNull()
  })
  it('combines substitutions and repeated performed movements, ranking weighted e1RM and keeping ties stable', () => {
    const model = buildWorkoutShareModel(session({ movements: [
      movement('original', [set({ actualLoad: 50, actualReps: 30, isTopSet: true })], { performedMovementId: 'row', performedMovementName: 'Actual row' }),
      movement('row', [set({ actualLoad: 100, actualReps: 3 }), set({ actualLoad: 100, actualReps: 4, setIndex: 1 })]),
      movement('reps', [set({ actualLoad: undefined, actualReps: 20 }), set({ actualLoad: 0, actualReps: 20, setIndex: 1 })]),
    ] }))!
    expect(model.completedSets).toBe(5)
    expect(model.exercises).toEqual([
      { movementId: 'row', name: 'Actual row', result: '100 kg × 4', isPr: false },
      { movementId: 'reps', name: 'reps', result: '20 reps', isPr: false },
    ])
  })
  it('uses RIR in e1RM and set order for exact weighted ties', () => {
    const model = buildWorkoutShareModel(session({ movements: [movement('a', [
      set({ actualLoad: 100, actualReps: 5, actualRir: 0, setIndex: 2 }),
      set({ actualLoad: 100, actualReps: 4, actualRir: 1, setIndex: 1 }),
    ])] }))!
    expect(model.exercises[0].result).toBe('100 kg × 4')
  })
  it('prioritises frozen PR headlines in workout order and counts all PR exercises before truncating', () => {
    const movements = Array.from({ length: 9 }, (_, i) => movement(String(i), [set()], { orderIndex: i }))
    const prs = ['8', '6', '2'].map((movementId) => ({ movementId, movementName: 'unused', kinds: ['heaviest_weight' as const], load: 101, reps: 2, e1rm: 123, previousLabel: 'private' }))
    const model = buildWorkoutShareModel(session({ movements: movements.reverse(), prs }))!
    expect(model.exercises.map((row) => row.movementId)).toEqual(['2', '6', '8', '0', '1', '3'])
    expect(model.exercises[0].result).toBe('101 kg × 2')
    expect(model.prCount).toBe(3)
    expect(model.overflowCount).toBe(3)
    expect(JSON.stringify(model)).not.toMatch(/private|programme|previousLabel/i)
  })
  it('uses scheduled calendar date and actual positive elapsed time', () => {
    const model = buildWorkoutShareModel(session({ startedAt: '2026-09-06T00:00:00+08:00', completedAt: '2026-09-06T01:02:03+08:00' }))!
    expect(model.dateLabel).toBe('September 5, 2026')
    expect(model.filename).toBe('sheetless-workout-2026-09-05.png')
    expect(model.durationSeconds).toBe(3723)
  })
  it.each([['bad', 'bad'], [null, null], ['2026-09-05T12:00:00Z', '2026-09-05T11:00:00Z']])('omits invalid duration', (startedAt, completedAt) => {
    expect(buildWorkoutShareModel(session({ startedAt, completedAt }))?.durationSeconds).toBeNull()
  })
  it.each(['2026-02-30', 'bad', '2026-09-05T23:00:00Z'])('rejects invalid calendar date %s', (scheduledDate) => {
    expect(buildWorkoutShareModel(session({ scheduledDate }))).toBeNull()
  })
})
