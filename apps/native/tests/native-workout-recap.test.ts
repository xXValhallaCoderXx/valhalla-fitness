import { describe, expect, it } from 'vitest'
import type { WorkoutSession } from '@sheetless/domain/session/types'
import type { ProgressionDecision } from '@sheetless/domain/program/types'
import { buildNativeWorkoutRecap, recordedSetLabel } from '../src/features/session/summary/native-workout-recap'
import { recapDecisionView, simpleRecapChange } from '../src/features/session/summary/recap-progression'

const session: WorkoutSession = {
  id: 'planned', sessionId: 'saved', stateVersion: 1, status: 'completed', title: 'Workout',
  templateId: '', programTitle: '', weekIndex: 0, weekLabel: '', hardness: null,
  scheduledDate: '2026-09-22', units: 'kg', rounding: 2.5, estimatedMinutes: 75,
  startedAt: '2026-09-22T10:00:00Z', completedAt: '2026-09-22T10:12:30Z',
  movements: [{ id: 'slot', movementId: 'bench_press', movementName: 'Bench press', role: 'main', orderIndex: 0,
    targetSummary: '2 × 5 at 80 kg', sets: [
      { id: 'one', setIndex: 1, targetLoad: 80, targetReps: 5, actualLoad: 0, actualReps: 10, completed: true },
      { id: 'two', setIndex: 2, targetLoad: 80, targetReps: 5, completed: false },
    ] }],
}
const decision: ProgressionDecision = { id: 'd', movementId: 'bench', movementName: 'Bench press',
  ruleId: 'training_max_hold', stateType: 'training_max', scope: 'cycle', status: 'pending',
  inputSummary: '', recommendation: 'Hold the training max', previousValue: 100, recommendedValue: 100 }

describe('saved native recap facts', () => {
  it('counts bodyweight work, excludes unlogged targets and uses saved elapsed time', () => {
    const recap = buildNativeWorkoutRecap(session)
    expect(recap.completion).toMatchObject({ completed: 1, planned: 2 })
    expect(recap.stats.volumeLabel).toBe('0 kg')
    expect(recap.durationLabel).toBe('12 min')
    expect(recap.exercises[0].sets).toEqual([{ id: 'one', index: 1, resultLabel: 'Bodyweight × 10', rir: null }])
    expect(recap.unloggedSets).toBe(1)
    expect(recap.sessionBest).toBeNull()
  })
  it('keeps historical empty workouts honest without inventing elapsed time or results', () => {
    const recap = buildNativeWorkoutRecap({ ...session, startedAt: null,
      movements: session.movements.map(m => ({ ...m, sets: m.sets.map(s => ({ ...s, completed: false })) })) })
    expect(recap.exercises).toEqual([])
    expect(recap.durationLabel).toBe('Duration unavailable')
    expect(recap.stats.movementCount).toBe(0)
    expect(recap.completion.completed).toBe(0)
  })
  it('never fills missing actual inputs from targets and attributes performed movements', () => {
    expect(recordedSetLabel({ ...session.movements[0].sets[0], actualLoad: null, actualReps: null }, 'kg'))
      .toBe('Reps not recorded · load not recorded')
    const recap = buildNativeWorkoutRecap({ ...session, movements: [{ ...session.movements[0],
      performedMovementId: 'push_up', performedMovementName: 'Push-up' }] })
    expect(recap.exercises[0]).toMatchObject({ name: 'Push-up', originalName: 'Bench press' })
  })
  it.each([
    { status: 'pending', next: 102.5, label: 'Increase proposed', change: '100 kg → 102.5 kg' },
    { status: 'accepted', next: 90, label: 'Reduction applied', change: '100 kg → 90 kg' },
    { status: 'pending', next: 100, label: 'Hold proposed', change: 'Hold at 100 kg' },
    { status: 'dismissed', next: 102.5, label: 'Kept current value', change: 'Kept at 100 kg' },
    { status: 'superseded', next: 90, label: 'Superseded', change: 'Later programme changes replaced this recommendation.' },
  ] as const)('distinguishes $label with truthful values and scope', ({ status, next, label, change }) => {
    expect(recapDecisionView({ ...decision, status, recommendedValue: next }, 'kg')).toMatchObject({ label, change, kindLabel: 'Training max' })
  })
  it('handles nonnumeric decisions and missing effort without fabricated claims', () => {
    const hold = recapDecisionView(decision, 'kg')
    expect(hold.reason).toContain('low or unrecorded')
    expect(hold.reason).not.toContain('very hard')
    const view = recapDecisionView({ ...decision, previousValue: null, recommendedValue: null,
      recommendation: 'Keep the rep range', ruleId: 'accessory_double_progression' }, 'lb')
    expect(view).toMatchObject({ label: 'Recommendation proposed', change: 'Keep the rep range', isNumeric: false })
  })
  it('keeps Simple proposals distinct from applied changes without promising a date or changing scope', () => {
    expect(simpleRecapChange({ ...decision, recommendedValue: 102.5 }, 'kg')).toBe('You can increase your training max by 2.5 kg.')
    expect(simpleRecapChange({ ...decision, status: 'accepted', stateType: 'working_load', recommendedValue: 95 }, 'lb'))
      .toBe('Your working weight decreased by 5 lb.')
    expect(simpleRecapChange({ ...decision, status: 'dismissed' }, 'kg')).toBe('You kept the previous value.')
  })
  it.each(['kg', 'lb'] as const)('keeps every saved recap result in %s', units => {
    const saved = { ...session, units, movements: [{ ...session.movements[0], sets: [{ ...session.movements[0].sets[0], actualLoad: 80, actualReps: 5 }] }] }
    const recap = buildNativeWorkoutRecap(saved)
    expect(recap.stats.volumeLabel).toBe(`400 ${units}`)
    expect(recap.exercises[0].sets[0].resultLabel).toBe(`80 ${units} × 5`)
    expect(recap.sessionBest?.resultLabel).toBe(`80 ${units} × 5`)
  })
})
