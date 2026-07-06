import { describe, expect, it } from 'vitest'
import {
  BALANCE_MIN_SETS,
  BALANCE_SKEW_FACTOR,
  CORE_REGIONS,
  LEG_REGIONS,
  PULL_REGIONS,
  PUSH_REGIONS,
  balanceSignalLabels,
  buildMovementBalance,
  buildWeeklyRegionSets,
} from '../src/domains/history/lib/muscle-volume'
import type {
  HistoryExerciseInput,
  HistorySessionInput,
  HistorySetInput,
} from '../src/domains/history/lib/history'
import type { Movement, WeeklyRegionSets } from '../src/shared/types'

function set(partial: Partial<HistorySetInput> = {}): HistorySetInput {
  return {
    id: partial.id ?? 'set-1',
    setIndex: partial.setIndex ?? 0,
    targetLoad: partial.targetLoad ?? 100,
    targetReps: partial.targetReps ?? 5,
    targetRir: partial.targetRir ?? 2,
    actualLoad: partial.actualLoad ?? 100,
    actualReps: partial.actualReps ?? 5,
    actualRir: partial.actualRir ?? 2,
    completed: partial.completed ?? true,
    isTopSet: partial.isTopSet ?? false,
    isAmrap: partial.isAmrap ?? false,
  }
}

function sets(count: number): HistorySetInput[] {
  return Array.from({ length: count }, (_, index) => set({ id: `set-${index}`, setIndex: index }))
}

function exercise(partial: Partial<HistoryExerciseInput> & { performedMovementId: string }): HistoryExerciseInput {
  return {
    id: partial.id ?? `ex-${partial.performedMovementId}`,
    plannedMovementId: partial.plannedMovementId ?? partial.performedMovementId,
    performedMovementId: partial.performedMovementId,
    performedMovementName: partial.performedMovementName ?? partial.performedMovementId,
    role: partial.role ?? 'main',
    sets: partial.sets ?? sets(3),
  }
}

function session(partial: Partial<HistorySessionInput> & { id: string }): HistorySessionInput {
  return {
    id: partial.id,
    plannedSessionId: partial.plannedSessionId ?? null,
    title: partial.title ?? 'Session',
    scheduledDate: partial.scheduledDate ?? '2026-06-15',
    completedAt: 'completedAt' in partial ? partial.completedAt : '2026-06-15T10:00:00Z',
    movementCount: partial.movementCount ?? partial.exercises?.length ?? 0,
    plannedSetCount: partial.plannedSetCount ?? 0,
    exercises: partial.exercises ?? [],
  }
}

function weekBucket(partial: Partial<WeeklyRegionSets> = {}): WeeklyRegionSets {
  const regionSets = partial.regionSets ?? {}
  const attributed = Object.values(regionSets).reduce((sum, value) => sum + (value ?? 0), 0)
  return {
    weekStart: partial.weekStart ?? '2026-06-15',
    weekLabel: partial.weekLabel ?? 'Jun 15',
    regionSets,
    totalSets: partial.totalSets ?? Math.round(attributed),
  }
}

function sumRegionSets(bucket: WeeklyRegionSets) {
  return Object.values(bucket.regionSets).reduce((sum, value) => sum + (value ?? 0), 0)
}

describe('buildWeeklyRegionSets', () => {
  it('attributes squat sets to its compound weight map, counting only completed sets', () => {
    const weekly = buildWeeklyRegionSets([
      session({
        id: 's1',
        completedAt: '2026-06-16T09:00:00Z',
        exercises: [
          exercise({
            performedMovementId: 'squat',
            sets: [...sets(4), set({ id: 'skipped', setIndex: 4, completed: false })],
          }),
        ],
      }),
    ])

    expect(weekly).toHaveLength(1)
    expect(weekly[0].weekStart).toBe('2026-06-15')
    expect(weekly[0].totalSets).toBe(4)
    // squat = quads 0.45 / glutes 0.3 / hamstrings 0.15 / core 0.1
    expect(weekly[0].regionSets).toEqual({ quads: 1.8, glutes: 1.2, hamstrings: 0.6, core: 0.4 })
  })

  it('reconciles fractional attribution with the raw completed-set count per week, ascending with empty weeks skipped', () => {
    // Newest-first, as the server delivers.
    const weekly = buildWeeklyRegionSets([
      session({
        id: 's2',
        completedAt: '2026-06-17T09:00:00Z',
        exercises: [
          exercise({ performedMovementId: 'bench_press', sets: sets(4) }),
          exercise({ performedMovementId: 'barbell_row', sets: sets(3) }),
        ],
      }),
      session({
        id: 's1',
        completedAt: '2026-06-02T09:00:00Z',
        exercises: [
          exercise({ performedMovementId: 'squat', sets: sets(5) }),
          exercise({ performedMovementId: 'deadlift', sets: sets(3) }),
        ],
      }),
    ])

    expect(weekly.map((bucket) => bucket.weekStart)).toEqual(['2026-06-01', '2026-06-15'])
    expect(weekly[0].totalSets).toBe(8)
    expect(weekly[1].totalSets).toBe(7)
    for (const bucket of weekly) {
      expect(Math.abs(sumRegionSets(bucket) - bucket.totalSets)).toBeLessThanOrEqual(0.05)
    }
  })

  it('falls back to category weights for a movement without a compound map', () => {
    const catalog: Record<string, Movement> = {
      mystery_press: {
        id: 'mystery_press',
        name: 'Mystery press',
        category: 'upper',
        equipment: [],
        defaultUnit: 'kg',
        isCompetition: false,
      },
    }
    const weekly = buildWeeklyRegionSets(
      [session({ id: 's1', exercises: [exercise({ performedMovementId: 'mystery_press', sets: sets(4) })] })],
      { catalog },
    )

    // upper fallback = chest 0.35 / shoulders 0.3 / triceps 0.25 / biceps 0.1
    expect(weekly[0].regionSets).toEqual({ chest: 1.4, shoulders: 1.2, triceps: 1, biceps: 0.4 })
    expect(weekly[0].totalSets).toBe(4)
    expect(Math.abs(sumRegionSets(weekly[0]) - weekly[0].totalSets)).toBeLessThanOrEqual(0.05)
  })

  it('counts fully unmapped movements toward totalSets without region attribution', () => {
    const weekly = buildWeeklyRegionSets([
      session({ id: 's1', exercises: [exercise({ performedMovementId: 'yoga_flow', sets: sets(2) })] }),
    ])

    expect(weekly[0].totalSets).toBe(2)
    expect(weekly[0].regionSets).toEqual({})
  })

  it('uses scheduledDate when completedAt is missing and merges sessions in the same week', () => {
    const weekly = buildWeeklyRegionSets([
      session({
        id: 's2',
        completedAt: null,
        scheduledDate: '2026-06-21',
        exercises: [exercise({ performedMovementId: 'barbell_curl', sets: sets(2) })],
      }),
      session({
        id: 's1',
        completedAt: '2026-06-15T08:00:00Z',
        exercises: [exercise({ performedMovementId: 'barbell_curl', sets: sets(3) })],
      }),
    ])

    expect(weekly).toHaveLength(1)
    expect(weekly[0].weekStart).toBe('2026-06-15')
    expect(weekly[0].regionSets).toEqual({ biceps: 5 })
    expect(weekly[0].totalSets).toBe(5)
  })
})

describe('buildMovementBalance', () => {
  it('reports insufficient below BALANCE_MIN_SETS and a verdict at the threshold', () => {
    const nineteen = buildMovementBalance([weekBucket({ regionSets: { chest: 19 } })], null)
    expect(nineteen.totalSets).toBe(BALANCE_MIN_SETS - 1)
    expect(nineteen.signal).toBe('insufficient')

    // 20 push sets against zero pull: any push with no pull is push-heavy.
    const twenty = buildMovementBalance([weekBucket({ regionSets: { chest: 20 } })], null)
    expect(twenty.totalSets).toBe(BALANCE_MIN_SETS)
    expect(twenty.signal).toBe('push_heavy')
  })

  it('flags push_heavy when push exceeds pull by the skew factor even with healthy legs', () => {
    const summary = buildMovementBalance(
      [
        weekBucket({
          regionSets: {
            chest: 8,
            shoulders: 4,
            triceps: 3,
            upper_back: 6,
            biceps: 2,
            quads: 10,
            glutes: 6,
            hamstrings: 3,
            calves: 1,
            core: 2,
          },
        }),
      ],
      null,
    )

    expect(summary.pushSets).toBe(15)
    expect(summary.pullSets).toBe(8)
    expect(summary.pushSets).toBeGreaterThan(summary.pullSets * BALANCE_SKEW_FACTOR)
    expect(summary.signal).toBe('push_heavy')
  })

  it('flags pull_heavy in the mirrored case', () => {
    const summary = buildMovementBalance(
      [weekBucket({ regionSets: { chest: 5, shoulders: 3, upper_back: 10, biceps: 5, quads: 12, glutes: 6 } })],
      null,
    )

    expect(summary.pushSets).toBe(8)
    expect(summary.pullSets).toBe(15)
    expect(summary.signal).toBe('pull_heavy')
  })

  it('flags legs_light when leg volume trails balanced upper-body work', () => {
    const summary = buildMovementBalance(
      [weekBucket({ regionSets: { chest: 6, shoulders: 4, upper_back: 8, biceps: 2, quads: 3, glutes: 1, core: 2 } })],
      null,
    )

    expect(summary.pushSets).toBe(10)
    expect(summary.pullSets).toBe(10)
    expect(summary.legSets).toBe(4)
    expect(summary.signal).toBe('legs_light')
  })

  it('reports balanced when no skew rule fires, rounding group sums to 1 decimal', () => {
    const summary = buildMovementBalance(
      [
        weekBucket({
          regionSets: { chest: 5.33, shoulders: 4.33, upper_back: 7, biceps: 2, quads: 8, hamstrings: 4, core: 3 },
          totalSets: 34,
        }),
      ],
      null,
    )

    expect(summary.pushSets).toBe(9.7)
    expect(summary.pullSets).toBe(9)
    expect(summary.legSets).toBe(12)
    expect(summary.coreSets).toBe(3)
    expect(summary.signal).toBe('balanced')
  })

  it('only counts the last rangeWeeks buckets', () => {
    const weekly = [
      weekBucket({ weekStart: '2026-06-01', regionSets: { chest: 30 } }),
      weekBucket({ weekStart: '2026-06-08', regionSets: { chest: 5, upper_back: 5 } }),
      weekBucket({ weekStart: '2026-06-15', regionSets: { chest: 4, upper_back: 5 } }),
    ]

    const lastTwo = buildMovementBalance(weekly, 2)
    expect(lastTwo.weeks).toBe(2)
    expect(lastTwo.totalSets).toBe(19)
    expect(lastTwo.pushSets).toBe(9)
    expect(lastTwo.pullSets).toBe(10)
    expect(lastTwo.signal).toBe('insufficient')

    const all = buildMovementBalance(weekly, null)
    expect(all.weeks).toBe(3)
    expect(all.totalSets).toBe(49)
    expect(all.signal).toBe('push_heavy')
  })
})

describe('region groups and labels', () => {
  it('partitions the taxonomy into push/pull/legs/core groups', () => {
    expect(PUSH_REGIONS).toEqual(['chest', 'shoulders', 'triceps'])
    expect(PULL_REGIONS).toEqual(['upper_back', 'biceps'])
    expect(LEG_REGIONS).toEqual(['quads', 'hamstrings', 'glutes', 'calves'])
    expect(CORE_REGIONS).toEqual(['core'])
  })

  it('labels every balance signal', () => {
    expect(balanceSignalLabels).toEqual({
      balanced: 'Well balanced',
      push_heavy: 'Push-heavy',
      pull_heavy: 'Pull-heavy',
      legs_light: 'Legs need love',
      insufficient: 'Building picture',
    })
  })
})
