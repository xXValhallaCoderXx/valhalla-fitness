import { describe, expect, it } from 'vitest'
import { buildWeeklyMovementTotals, totalsByMovement } from '@sheetless/domain/history/movement-weeks'
import type { HistorySessionInput } from '@sheetless/domain/history/history'

function session(scheduledDate: string, exercises: HistorySessionInput['exercises'], units: 'kg' | 'lb' = 'kg'): HistorySessionInput {
  return {
    id: `s-${scheduledDate}`,
    plannedSessionId: null,
    title: 'Session',
    scheduledDate,
    completedAt: `${scheduledDate}T10:00:00.000Z`,
    programInstanceId: 'p1',
    units,
    exercises,
  } as unknown as HistorySessionInput
}

function exercise(movementId: string, sets: Array<{ load: number | null; reps: number | null; completed?: boolean }>) {
  return {
    id: `e-${movementId}`,
    plannedMovementId: movementId,
    performedMovementId: movementId,
    performedMovementName: movementId,
    role: 'main' as const,
    sets: sets.map((set, index) => ({
      id: `set-${index}`,
      setIndex: index,
      actualLoad: set.load,
      actualReps: set.reps,
      completed: set.completed ?? true,
    })),
  }
}

describe('buildWeeklyMovementTotals', () => {
  it('buckets work by Monday week and movement', () => {
    const weeks = buildWeeklyMovementTotals([
      // Both land in the week beginning Mon 3 Aug 2026.
      session('2026-08-05', [exercise('squat', [{ load: 100, reps: 5 }, { load: 100, reps: 5 }])]),
      session('2026-08-07', [exercise('squat', [{ load: 110, reps: 3 }])]),
      session('2026-08-12', [exercise('squat', [{ load: 105, reps: 5 }])]),
    ])
    expect(weeks).toHaveLength(2)
    expect(weeks[0]).toMatchObject({ movementId: 'squat', completedSets: 3, volume: 1330, bestLoad: 110, bestReps: 3 })
    expect(weeks[1]).toMatchObject({ completedSets: 1, volume: 525 })
  })

  // A bodyweight set is work, and counts as such — it just has no volume to add.
  it('counts loadless sets without inventing volume', () => {
    const [week] = buildWeeklyMovementTotals([
      session('2026-08-05', [exercise('pull_up', [{ load: null, reps: 8 }, { load: 0, reps: 6 }])]),
    ])
    expect(week).toMatchObject({ completedSets: 2, volume: 0, bestLoad: null })
  })

  it('skips incomplete sets', () => {
    const [week] = buildWeeklyMovementTotals([
      session('2026-08-05', [exercise('squat', [{ load: 100, reps: 5 }, { load: 100, reps: 5, completed: false }])]),
    ])
    expect(week.completedSets).toBe(1)
  })

  it('normalises to the account units', () => {
    const [week] = buildWeeklyMovementTotals(
      [session('2026-08-05', [exercise('squat', [{ load: 100, reps: 1 }])], 'lb')],
      { units: 'lb' },
    )
    expect(week.volume).toBe(100)
  })
})

describe('totalsByMovement', () => {
  it('collapses a range slice back to one row per movement', () => {
    const weeks = buildWeeklyMovementTotals([
      session('2026-08-05', [exercise('squat', [{ load: 100, reps: 5 }]), exercise('bench_press', [{ load: 60, reps: 5 }])]),
      session('2026-08-12', [exercise('squat', [{ load: 120, reps: 3 }])]),
    ])
    const totals = totalsByMovement(weeks)
    expect(totals.get('squat')).toMatchObject({ completedSets: 2, volume: 860, bestLoad: 120, lastWeekStart: '2026-08-10' })
    expect(totals.get('bench_press')?.completedSets).toBe(1)
  })

  it('has nothing to say about an empty range', () => {
    expect(totalsByMovement([]).size).toBe(0)
  })
})
