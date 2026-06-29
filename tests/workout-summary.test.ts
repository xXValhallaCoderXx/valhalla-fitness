import { describe, expect, it } from 'vitest'
import { buildWorkoutSummary, rirTone } from '../src/domains/history/lib/workout-summary'
import type { MovementRole, MovementSlot, SetLog, WorkoutSession } from '../src/shared/types'

function st(setIndex: number, over: Partial<SetLog> = {}): SetLog {
  return { id: `set-${setIndex}`, setIndex, completed: true, ...over }
}

function mv(role: MovementRole, sets: SetLog[], over: Partial<MovementSlot> = {}): MovementSlot {
  return {
    id: over.id ?? `mv-${role}`,
    movementId: 'm',
    movementName: over.movementName ?? 'Bench Press',
    role,
    orderIndex: over.orderIndex ?? 1,
    targetSummary: over.targetSummary ?? '4 × 5+',
    sets,
    ...over,
  }
}

function session(movements: MovementSlot[], over: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 's1',
    sessionId: 's1',
    title: 'Bench Wave',
    programTitle: 'Old School Wave',
    templateId: 't1',
    weekIndex: 0,
    weekLabel: 'Base W2 · Week 1',
    hardness: 'Light',
    scheduledDate: '2026-06-28',
    estimatedMinutes: 80,
    units: 'kg',
    rounding: 2.5,
    status: 'completed',
    notes: null,
    movements,
    ...over,
  }
}

const fullSession = session([
  mv(
    'main',
    [
      st(1, { actualLoad: 100, actualReps: 5, actualRir: 2, targetReps: 5 }),
      st(2, { actualLoad: 100, actualReps: 5, actualRir: 2, targetReps: 5 }),
      st(3, { actualLoad: 100, actualReps: 5, actualRir: 2, targetReps: 5 }),
      st(4, { actualLoad: 100, actualReps: 10, actualRir: 1, targetReps: 5, isAmrap: true }),
    ],
    { movementName: 'Bench Press' },
  ),
  mv(
    'variation',
    [
      st(1, { actualLoad: 80, actualReps: 10, actualRir: 2, targetReps: 10 }),
      st(2, { actualLoad: 80, actualReps: 10, actualRir: 2, targetReps: 10 }),
      st(3, { actualLoad: 80, actualReps: 10, actualRir: 2, targetReps: 10 }),
    ],
    { movementName: 'Close-Grip Bench Press' },
  ),
  mv(
    'accessory',
    [
      st(1, { actualLoad: 50, actualReps: 12, actualRir: 3, targetRepMin: 10, targetRepMax: 15 }),
      st(2, { actualLoad: 50, actualReps: 12, actualRir: 3, targetRepMin: 10, targetRepMax: 15 }),
      st(3, { actualLoad: 50, actualReps: 12, actualRir: 3, targetRepMin: 10, targetRepMax: 15 }),
    ],
    { movementName: 'Chest-Supported Row' },
  ),
])

describe('buildWorkoutSummary', () => {
  it('computes completion, stats, and the session-best e1RM', () => {
    const model = buildWorkoutSummary(fullSession)

    expect(model.completion).toEqual({ completed: 10, planned: 10, percent: 100 })
    expect(model.stats.movementCount).toBe(3)
    expect(model.stats.topSetCount).toBe(1) // the AMRAP set
    expect(model.stats.durationMinutes).toBe(80)
    expect(model.stats.volumeLabel).toBe('6,700 kg') // 2500 + 2400 + 1800

    expect(model.sessionBest).toMatchObject({
      movementName: 'Bench Press',
      resultLabel: '100 kg × 10+',
      e1rmLabel: '136.7 kg',
      rir: 1,
    })
  })

  it('builds per-exercise cards with accent, default-open, and set rows', () => {
    const model = buildWorkoutSummary(fullSession)
    const [main, variation, accessory] = model.exercises

    expect(main).toMatchObject({ tagLabel: 'Main', accentTone: 'action', defaultOpen: true, hitEveryTarget: true })
    expect(variation).toMatchObject({ tagLabel: 'Variation', accentTone: 'accent', defaultOpen: true })
    expect(accessory).toMatchObject({ tagLabel: 'Accessory', accentTone: 'warning', defaultOpen: false })

    expect(main.sets).toHaveLength(4)
    expect(main.sets[3]).toMatchObject({ index: 4, resultLabel: '100 kg × 10+', isTop: true, rir: 1, rirTone: 'danger' })
    expect(main.sets[0].rirTone).toBe('action') // RIR 2
    expect(accessory.sets[0].rirTone).toBe('success') // RIR 3
    expect(main.bestSetLabel).toBe('100 kg × 10+')
  })

  it('marks hitEveryTarget false when a set misses or has no target', () => {
    const missed = buildWorkoutSummary(
      session([mv('main', [st(1, { actualLoad: 100, actualReps: 3, targetReps: 5 })])]),
    )
    expect(missed.exercises[0].hitEveryTarget).toBe(false)

    const noTarget = buildWorkoutSummary(
      session([mv('main', [st(1, { actualLoad: 100, actualReps: 8 })])]),
    )
    expect(noTarget.exercises[0].hitEveryTarget).toBe(false)
  })

  it('handles an all-incomplete session: no best, 0% ring, zero volume', () => {
    const model = buildWorkoutSummary(
      session([mv('main', [st(1, { completed: false, targetLoad: 100, targetReps: 5 }), st(2, { completed: false })])]),
    )
    expect(model.completion).toEqual({ completed: 0, planned: 2, percent: 0 })
    expect(model.sessionBest).toBeNull()
    expect(model.stats.volumeLabel).toBe('0 kg')
    expect(model.exercises[0].completedSetCount).toBe(0)
    expect(model.exercises[0].sets).toHaveLength(2) // falls back to all sets when none completed
  })
})

describe('rirTone', () => {
  it('maps reps-in-reserve to an effort tone', () => {
    expect(rirTone(0)).toBe('danger')
    expect(rirTone(1)).toBe('danger')
    expect(rirTone(2)).toBe('action')
    expect(rirTone(3)).toBe('success')
    expect(rirTone(null)).toBe('neutral')
  })
})
