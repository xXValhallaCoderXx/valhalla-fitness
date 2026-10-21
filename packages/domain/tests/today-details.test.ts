import { describe, expect, it } from 'vitest'
import type { MovementSlot, WorkoutSession } from '../src/session/types'
import { todayLoadProvenance, todayMovementPreview } from '../src/session/today-prescription'
import { workoutDurationLabel, workoutEffort, workoutMuscleSets, workoutMusclesByExerciseCount } from '../src/session/today-details'

const movement: MovementSlot = {
  id: 'press', movementId: 'overhead_press', movementName: 'Overhead Press', role: 'main', orderIndex: 0,
  targetSummary: 'An old summary must not overwrite adjusted targets',
  sets: [0.75, 0.85, 0.95].map((percent, i) => ({
    id: `set-${i}`, setIndex: i + 1, completed: true, targetLoad: [50, 57.5, 65][i],
    targetReps: [5, 3, 1][i], isAmrap: i === 2, isTopSet: i === 2, targetRir: 2,
    actualLoad: [50, 57.5, 65][i], actualReps: [5, 3, 1][i], actualRir: [2, 2, 1][i],
    sourcePrescription: { targetLoad: { kind: 'percent_of_state', stateType: 'training_max', percent, default: 'low' } },
    sourceBinding: { stateKey: 'press_training_max', stateType: 'training_max', value: 67.5 },
  })),
}
const session: WorkoutSession = {
  id: 'planned', sessionId: 'saved', stateVersion: 1, status: 'completed', title: 'Press', programTitle: 'Wave',
  templateId: 'wave', weekIndex: 13, weekLabel: 'Week 3', phaseLabel: 'Peak', hardness: 'Hard',
  scheduledDate: '2026-09-20', estimatedMinutes: 75, units: 'kg', rounding: 2.5,
  movements: [movement], sessionRpe: 8, startedAt: '2026-09-20T00:00:00Z', completedAt: '2026-09-20T01:02:30Z',
}

describe('Today prescription facts', () => {
  it('ranks muscle groups by exercise count without letting a single high-set exercise dominate', () => {
    const workout = { ...session, movements: [
      { ...movement, movementId: 'standing_dumbbell_calf_raise', sets: Array.from({ length: 20 }, () => movement.sets[0]) },
      ...['overhead_press', 'bench_press', 'dumbbell_bench_press'].map(movementId => ({
        ...movement, movementId, sets: [movement.sets[0]],
      })),
      { ...movement, movementId: 'unknown' },
    ] }
    expect(workoutMuscleSets(workout)[0].id).toBe('calves')
    expect(workoutMusclesByExerciseCount(workout).slice(0, 3)).toEqual(['shoulders', 'triceps', 'chest'])
    expect(workoutMusclesByExerciseCount({ ...session, movements: [] })).toEqual([])
  })

  it('keeps load and effort targets while adding verifiable source context in Advanced', () => {
    expect(todayMovementPreview(movement, session, 'guided').prescription).toBe('3 sets · working up to 65 kg · leave 2 reps')
    const full = todayMovementPreview(movement, session, 'full')
    expect(full.loadLabel).toBe('50 · 57.5 · 65 kg')
    expect(full.prescription).toBe('75%×5 · 85%×3 · 95%×1+ · RIR 2')
    expect(todayLoadProvenance(movement, session)).toBe('95% of your 67.5 kg training max, rounded to 2.5')
    const adjusted = { ...movement, sets: movement.sets.map(set => ({ ...set, targetLoad: 40 })) }
    expect(todayLoadProvenance(adjusted, session)).toBe('Adjusted target · see calculation')
    expect(todayMovementPreview(adjusted, session, 'full').prescription).not.toContain('%')
    expect(todayMovementPreview(adjusted, session, 'full').loadLabel).toBe('40 kg')
  })

  it('distinguishes missing loads from bodyweight and keeps past performance separate from targets', () => {
    const chosen = { ...movement, movementId: 'dumbbell_row', sets: [{ id: 'one', setIndex: 1, completed: false, targetRepMin: 8, targetRepMax: 12 }] }
    expect(todayMovementPreview(chosen, session, 'full')).toMatchObject({ loadLabel: '—', prescription: '1 × 8–12 · you choose the load' })
    expect(todayLoadProvenance(chosen, session)).toBeNull()
    const bw = { ...chosen, movementId: 'pull_up', previous: { movementId: 'pull_up', label: '', load: 0, reps: 10, rir: 2 } }
    expect(todayMovementPreview(bw, session, 'full')).toMatchObject({ loadLabel: 'Bodyweight', prescription: '1 × 8–12 · last time BW × 10 at RIR 2' })
    expect(todayMovementPreview({ ...bw, loadSuggestionCutoff: '2026-09-20' }, session, 'full').prescription).not.toContain('last time')
  })
})

describe('Today saved-workout facts', () => {
  it('uses saved effort and real elapsed time, never planned effort or duration as a fallback', () => {
    expect(workoutDurationLabel(session)).toBe('62 min')
    expect(workoutDurationLabel({ ...session, startedAt: null })).toBe('Duration unavailable')
    expect(workoutEffort(session)).toMatchObject({ rating: 8, averageRir: 5 / 3, targetRir: 2, recordedSets: 3, completedSets: 3 })
    const missing = { ...session, sessionRpe: null, movements: [{ ...movement, sets: movement.sets.map(set => ({ ...set, actualRir: null })) }] }
    expect(workoutEffort(missing)).toMatchObject({ rating: null, averageRir: null, targetRir: 2, recordedSets: 0 })
    expect(workoutEffort(missing).comparison).toContain('no completed sets with both')
  })

  it('excludes unlogged sets and compares actual and planned effort on matched sets only', () => {
    const partial = { ...session, movements: [{ ...movement, sets: [
      { ...movement.sets[0], actualRir: 1, targetRir: 2 },
      { ...movement.sets[1], actualRir: 8, targetRir: null },
      { ...movement.sets[2], completed: false, actualRir: 9, targetRir: 9 },
    ] }] }
    expect(workoutEffort(partial)).toMatchObject({ averageRir: 4.5, targetRir: 2, recordedSets: 2, completedSets: 2 })
    expect(workoutEffort(partial).comparison).toContain('the set with both values, you logged fewer')
  })

  it('attributes performed movements and only completed work, including loadless sets', () => {
    const workout = { ...session, movements: [{ ...movement, performedMovementId: 'standing_dumbbell_calf_raise',
      sets: movement.sets.map((set, i) => ({ ...set, completed: i === 0, actualLoad: 0, actualReps: 10 })) }] }
    expect(workoutMuscleSets(workout)).toEqual([{ id: 'calves', label: 'Calves', sets: 3 }])
    expect(workoutMuscleSets(workout, true)).toEqual([{ id: 'calves', label: 'Calves', sets: 1 }])
    expect(workoutMuscleSets({ ...session, movements: [{ ...movement, movementId: 'unknown' }] })).toEqual([])
  })
})
