import { describe, expect, it } from 'vitest'
import { buildProgramSetupSuggestions } from '../src/program/setup-suggestions'
import type { HistorySessionInput, HistorySetInput } from '../src/history/history'
import type { ProgramStateRequirement } from '../src/program/types'
import { convertWeight } from '../src/shared/math'

const required: ProgramStateRequirement[] = [
  { key: 'squat_training_max', movementId: 'squat', type: 'training_max' },
  { key: 'bench_press_working_load', movementId: 'bench_press', type: 'working_load' },
]
function session(id: string, load: number, overrides: Partial<HistorySessionInput> = {}, set: Partial<HistorySetInput> = {}): HistorySessionInput {
  return { id, plannedSessionId: null, title: 'Workout', scheduledDate: `2026-09-${id.padStart(2, '0')}`,
    completedAt: `2026-09-${id.padStart(2, '0')}T10:00:00Z`, units: 'kg', movementCount: 1, plannedSetCount: 1,
    exercises: [{ id: `exercise-${id}`, plannedMovementId: 'squat', performedMovementId: 'squat', performedMovementName: 'Squat', role: 'main',
      sets: [{ id: `set-${id}`, setIndex: 1, actualLoad: load, actualReps: 1, actualRir: 0, completed: true, ...set }] }], ...overrides }
}
const build = (overrides: Partial<Parameters<typeof buildProgramSetupSuggestions>[0]> = {}) => buildProgramSetupSuggestions({
  templateId: 'test', requiredState: required, units: 'kg', rounding: 2.5, defaults: { bench_press_one_rep_max: 100 }, sessions: [], ...overrides,
})

describe('account starting suggestions', () => {
  it('normalizes mixed units before eligibility/outlier checks and uses actual dated lifts', () => {
    const sessions = [session('1', 100), session('2', 100), session('3', 100), session('4', convertWeight(110, 'kg', 'lb'), { units: 'lb' })]
    const result = build({ sessions })
    expect(result.sourceRows[0]).toMatchObject({ source: 'history', reference: 113.5, bestSet: { reps: 1, date: '2026-09-04' } })
    expect(result.sourceRows[0].bestSet?.load).toBeCloseTo(110)
    expect(result.stateValues[0].value).toBe(102.5)
    expect(result.sourceRows[1]).toMatchObject({ source: 'estimate', reference: 100, bestSet: null })
    expect(result.stateValues[1].value).toBe(75)
  })

  it('excludes actual outliers, unsupported variations, high-rep and unfinished sets', () => {
    const sessions = [session('1', 100), session('2', 100), session('3', 100), session('4', 300),
      session('5', 400, {}, { completed: false }), session('6', 400, {}, { actualReps: 13 }),
      session('7', 400, { exercises: [{ id: 'front', plannedMovementId: 'squat', performedMovementId: 'front_squat',
        performedMovementName: 'Front squat', role: 'main', sets: [{ id: 'front', setIndex: 1, actualLoad: 400, actualReps: 1, actualRir: 0, completed: true }] }] })]
    const result = build({ sessions })
    expect(result.sourceRows[0].reference).toBe(103.5)
    expect(result.sourceRows[0].bestSet?.date).toBe('2026-09-01')
  })

  it('discloses unknown units instead of treating them as profile units', () => {
    const result = build({ sessions: [session('1', 500, { units: null })], defaults: { squat_one_rep_max: 100 } })
    expect(result.unknownUnitSessions).toBe(1)
    expect(result.sourceRows[0]).toMatchObject({ source: 'estimate', reference: 100, bestSet: null })
    expect(result.stateValues[0].value).toBe(90)
  })

  it('preserves matching manual and five-rep defaults exactly, without deriving them from one-rep history', () => {
    const result = build({ requiredState: [
      { key: 'custom_manual', movementId: 'squat', type: 'manual' },
      { key: 'squat_five_rep_max', movementId: 'squat', type: 'five_rep_max' },
      { key: 'missing_manual', movementId: 'bench_press', type: 'manual' },
    ], defaults: { custom_manual: 57.25, squat_five_rep_max: 83.75, squat_one_rep_max: 150 }, sessions: [session('1', 200)] })
    expect(result.stateValues.map(row => row.value)).toEqual([57.25, 83.75, null])
    expect(result.sourceRows.map(row => row.source)).toEqual(['saved', 'saved', 'manual'])
  })

  it('does not invent references for unsupported lifts or history failure', () => {
    const result = build({ historyStatus: 'unavailable', requiredState: [{ key: 'curl_working_load', movementId: 'dumbbell_curl', type: 'working_load' }], defaults: {} })
    expect(result.historyStatus).toBe('unavailable')
    expect(result.stateValues[0].value).toBeNull()
    expect(result.sourceRows[0].source).toBe('manual')
  })
})
