import { describe, expect, it } from 'vitest'
import type { AccessoryMovementOption } from '../src/movement/types'
import { buildFrequentExercises, frequentExercisesWindowStart, type FrequentExerciseHistory } from '../src/session/frequent-exercises'

const option = (id: string, name = id, freeWeightCompatible = true): AccessoryMovementOption => ({
  movementId: id, movementName: name, freeWeightCompatible,
  category: 'upper', equipment: [], requiredEquipment: [], defaultUnit: 'kg',
})
const exercise = (performedMovementId: string, actualReps: number | null = 5, completed = true) => ({
  performedMovementId, sets: [{ completed, actualReps }],
})
const session = (id: string, movements: string[], scheduledDate = '2026-09-27', completedAt?: string): FrequentExerciseHistory => ({
  id, scheduledDate, completedAt, exercises: movements.map(id => exercise(id)),
})
const today = '2026-09-27'

describe('frequent exercises', () => {
  it('counts distinct completed workouts, not repeated slots or set counts', () => {
    const result = buildFrequentExercises({ today, options: ['squat', 'press'].map(id => option(id)), sessions: [
      session('one', ['squat', 'squat', 'squat', 'press']),
      session('two', ['press']), session('two', ['press']),
    ] })
    expect(result.map(row => [row.movementId, row.completedWorkoutCount])).toEqual([['press', 2], ['squat', 1]])
  })

  it('includes the first and last of exactly 90 calendar days, excluding future and invalid dates', () => {
    expect(frequentExercisesWindowStart(today)).toBe('2026-06-30')
    const result = buildFrequentExercises({ today, options: [option('squat')], sessions: [
      session('start', ['squat'], '2026-06-30'), session('end', ['squat']),
      session('old', ['squat'], '2026-06-29'), session('future', ['squat'], '2026-09-28'),
      session('invalid', ['squat'], '2026-09-99'),
    ] })
    expect(result[0]).toMatchObject({ completedWorkoutCount: 2, lastWorkoutDate: today })
    expect(() => frequentExercisesWindowStart('not a date')).toThrow(RangeError)
    expect(frequentExercisesWindowStart('2024-03-01')).toBe('2023-12-03')
  })

  it('requires completed, recorded positive repetitions without requiring external load', () => {
    const result = buildFrequentExercises({ today, options: ['bodyweight', 'unlogged', 'zero', 'missing', 'invalid'].map(id => option(id)),
      sessions: [{ ...session('one', []), exercises: [
        exercise('bodyweight', 10), exercise('unlogged', 5, false), exercise('zero', 0),
        exercise('missing', null), exercise('invalid', Number.NaN),
      ] }],
    })
    expect(result.map(row => row.movementId)).toEqual(['bodyweight'])
  })

  it('suggests only currently eligible performed movements and observes free-weight filtering', () => {
    const sessions = [session('one', ['performed', 'removed', 'machine'])]
    const options = [option('planned'), option('performed'), option('machine', 'Machine', false)]
    expect(buildFrequentExercises({ today, options, sessions, freeWeightOnly: true })
      .map(row => row.movementId)).toEqual(['performed'])
    expect(buildFrequentExercises({ today, options, sessions }).map(row => row.movementId)).toEqual(['machine', 'performed'])
  })

  it('breaks frequency ties by latest workout date, completion time, name and ID, and returns at most three', () => {
    const options = [option('old'), option('later'), option('a', 'Same'), option('b', 'Same'), option('z', 'Zed')]
    const sessions = [
      session('old', ['old'], '2026-09-26', '2026-09-28T12:00:00Z'),
      session('early', ['a', 'b', 'z'], today, '2026-09-27T10:00:00Z'),
      session('late', ['later'], today, '2026-09-27T12:00:00Z'),
    ]
    expect(buildFrequentExercises({ today, options, sessions }).map(row => row.movementId)).toEqual(['later', 'a', 'b'])
  })
})
