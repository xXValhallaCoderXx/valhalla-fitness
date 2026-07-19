import { describe, expect, it } from 'vitest'
import {
  buildLiftE1rmSeries,
  buildPowerliftingTotal,
  classifyE1rmTrend,
  computeVelocity,
  detectStall,
  e1rmTrendLabels,
  stallSignalLabels,
} from '../src/domains/history/lib/strength'
import type {
  HistoryExerciseInput,
  HistorySessionInput,
  HistorySetInput,
} from '../src/domains/history/lib/history'
import type { E1rmPoint, LiftE1rmSeries } from '../src/shared/types'

const NOW = '2026-07-05T00:00:00.000Z'

function daysAgo(days: number): string {
  return new Date(Date.parse(NOW) - days * 86_400_000).toISOString()
}

function set(partial: Partial<HistorySetInput> = {}): HistorySetInput {
  return {
    id: partial.id ?? 'set-1',
    setIndex: partial.setIndex ?? 0,
    actualLoad: 'actualLoad' in partial ? (partial.actualLoad ?? null) : 100,
    actualReps: 'actualReps' in partial ? (partial.actualReps ?? null) : 5,
    actualRir: 'actualRir' in partial ? (partial.actualRir ?? null) : 0,
    completed: partial.completed ?? true,
    isTopSet: partial.isTopSet ?? false,
    isAmrap: partial.isAmrap ?? false,
  }
}

function exercise(partial: Partial<HistoryExerciseInput> = {}): HistoryExerciseInput {
  const movementId = partial.performedMovementId ?? 'squat'
  return {
    id: partial.id ?? `ex-${movementId}`,
    plannedMovementId: partial.plannedMovementId ?? movementId,
    performedMovementId: movementId,
    performedMovementName: partial.performedMovementName ?? movementId,
    role: partial.role ?? 'main',
    sets: partial.sets ?? [set()],
  }
}

function session(partial: Partial<HistorySessionInput> = {}): HistorySessionInput {
  const scheduledDate = partial.scheduledDate ?? daysAgo(7)
  return {
    id: partial.id ?? 'session-1',
    plannedSessionId: partial.plannedSessionId ?? null,
    title: partial.title ?? 'Session',
    scheduledDate,
    completedAt: 'completedAt' in partial ? partial.completedAt : scheduledDate,
    units: 'units' in partial ? partial.units : 'kg',
    movementCount: partial.movementCount ?? 1,
    plannedSetCount: partial.plannedSetCount ?? 3,
    exercises: partial.exercises ?? [exercise()],
  }
}

/** One squat session with the given single-set loads at reps=1 rir=0. */
function singlesSession(id: string, date: string, loads: number[]): HistorySessionInput {
  return session({
    id,
    scheduledDate: date,
    exercises: [
      exercise({
        sets: loads.map((load, index) => set({ id: `${id}-set-${index}`, setIndex: index, actualLoad: load, actualReps: 1 })),
      }),
    ],
  })
}

function point(date: string, e1rmValue: number, partial: Partial<E1rmPoint> = {}): E1rmPoint {
  return {
    date,
    sessionId: partial.sessionId ?? `session-${date}`,
    e1rm: e1rmValue,
    load: partial.load ?? e1rmValue,
    reps: partial.reps ?? 1,
    rir: partial.rir ?? null,
    outlier: partial.outlier ?? false,
  }
}

function series(movementId: string, points: E1rmPoint[]): LiftE1rmSeries {
  return {
    movementId,
    movementName: movementId,
    points,
    repMaxBests: { oneRm: null, threeRm: null, fiveRm: null },
  }
}

describe('buildLiftE1rmSeries', () => {
  it('emits one point per session from the max-e1rm eligible set', () => {
    const result = buildLiftE1rmSeries([
      session({
        exercises: [
          exercise({
            sets: [
              set({ id: 'a', actualLoad: 100, actualReps: 5, actualRir: 2 }), // 123.5
              set({ id: 'b', actualLoad: 120, actualReps: 3, actualRir: 1 }), // 136
              set({ id: 'c', actualLoad: 110, actualReps: 2, actualRir: 0 }), // 117.5
            ],
          }),
        ],
      }),
    ])

    expect(result).toHaveLength(1)
    expect(result[0].movementId).toBe('squat')
    expect(result[0].movementName).toBe('Squat')
    expect(result[0].points).toHaveLength(1)
    expect(result[0].points[0]).toMatchObject({ e1rm: 136, load: 120, reps: 3, rir: 1, outlier: false })
  })

  it('excludes variations and non-strength movements by exact id', () => {
    const onlyVariations = buildLiftE1rmSeries([
      session({
        exercises: [
          exercise({ performedMovementId: 'front_squat' }),
          exercise({ performedMovementId: 'leg_press' }),
        ],
      }),
    ])
    expect(onlyVariations).toEqual([])

    const mixed = buildLiftE1rmSeries([
      session({
        exercises: [
          exercise({ performedMovementId: 'squat', sets: [set({ actualLoad: 100, actualReps: 5 })] }),
          exercise({ performedMovementId: 'front_squat', sets: [set({ actualLoad: 200, actualReps: 5 })] }),
        ],
      }),
    ])
    expect(mixed).toHaveLength(1)
    expect(mixed[0].points[0].e1rm).toBe(116.5) // squat set only, not the heavier front squat
  })

  it('excludes sets above 12 reps and keeps 12-rep sets', () => {
    const thirteen = buildLiftE1rmSeries([
      session({ exercises: [exercise({ sets: [set({ actualLoad: 100, actualReps: 13 })] })] }),
    ])
    expect(thirteen).toEqual([])

    const twelve = buildLiftE1rmSeries([
      session({ exercises: [exercise({ sets: [set({ actualLoad: 80, actualReps: 12 })] })] }),
    ])
    expect(twelve[0].points[0]).toMatchObject({ e1rm: 112, reps: 12 })
  })

  it('treats missing RIR as 0 and records null rir on the point', () => {
    const result = buildLiftE1rmSeries([
      session({ exercises: [exercise({ sets: [set({ actualLoad: 100, actualReps: 5, actualRir: null })] })] }),
    ])
    expect(result[0].points[0]).toMatchObject({ e1rm: 116.5, rir: null })
  })

  it('flags a high point as outlier once 3 prior points exist', () => {
    // Newest-first input, as the server sends it.
    const result = buildLiftE1rmSeries([
      singlesSession('s4', daysAgo(7), [220]),
      singlesSession('s3', daysAgo(14), [104]),
      singlesSession('s2', daysAgo(21), [102]),
      singlesSession('s1', daysAgo(28), [100]),
    ])

    const points = result[0].points
    expect(points.map((p) => p.date)).toEqual([daysAgo(28), daysAgo(21), daysAgo(14), daysAgo(7)])
    expect(points.map((p) => p.outlier)).toEqual([false, false, false, true])
  })

  it('never flags outliers with fewer than 3 prior points', () => {
    const result = buildLiftE1rmSeries([
      singlesSession('s3', daysAgo(7), [220]),
      singlesSession('s2', daysAgo(14), [102]),
      singlesSession('s1', daysAgo(21), [100]),
    ])
    expect(result[0].points.map((p) => p.outlier)).toEqual([false, false, false])
  })

  it('excludes outlier sessions from rep-max bests', () => {
    const result = buildLiftE1rmSeries([
      singlesSession('s4', daysAgo(7), [220]),
      singlesSession('s3', daysAgo(14), [104]),
      singlesSession('s2', daysAgo(21), [102]),
      singlesSession('s1', daysAgo(28), [100]),
    ])
    expect(result[0].repMaxBests.oneRm).toMatchObject({ load: 104, reps: 1 })
    expect(result[0].repMaxBests.threeRm).toBeNull()
    expect(result[0].repMaxBests.fiveRm).toBeNull()
  })

  it('a 5-rep set seeds all rep maxes; a later heavier single only bumps oneRm', () => {
    const result = buildLiftE1rmSeries([
      session({
        id: 's2',
        scheduledDate: daysAgo(7),
        exercises: [exercise({ sets: [set({ actualLoad: 110, actualReps: 1 })] })],
      }),
      session({
        id: 's1',
        scheduledDate: daysAgo(14),
        exercises: [exercise({ sets: [set({ actualLoad: 100, actualReps: 5 })] })],
      }),
    ])

    const bests = result[0].repMaxBests
    expect(bests.oneRm).toEqual({ load: 110, reps: 1, date: daysAgo(7) })
    expect(bests.threeRm).toEqual({ load: 100, reps: 5, date: daysAgo(14) })
    expect(bests.fiveRm).toEqual({ load: 100, reps: 5, date: daysAgo(14) })
  })
})

describe('classifyE1rmTrend', () => {
  it('is insufficient with no points, under 4 points, or under a 21-day span', () => {
    expect(classifyE1rmTrend([], NOW)).toBe('insufficient')
    expect(classifyE1rmTrend([point(daysAgo(28), 100), point(daysAgo(14), 101), point(daysAgo(0), 102)], NOW)).toBe(
      'insufficient',
    )
    expect(
      classifyE1rmTrend(
        [point(daysAgo(20), 100), point(daysAgo(14), 101), point(daysAgo(7), 102), point(daysAgo(0), 103)],
        NOW,
      ),
    ).toBe('insufficient')
  })

  it('is detraining when the newest point is 5 weeks old', () => {
    const points = [70, 63, 56, 49, 42, 35].map((days, index) => point(daysAgo(days), 100 + index))
    expect(classifyE1rmTrend(points, NOW)).toBe('detraining')
  })

  it('classifies rising, flat, and declining slopes', () => {
    const days = [35, 28, 21, 14, 7, 0]
    const rising = days.map((d, index) => point(daysAgo(d), 100 + index)) // +1%/week
    const flat = days.map((d, index) => point(daysAgo(d), 100 + index * 0.1)) // +0.1%/week
    const declining = days.map((d, index) => point(daysAgo(d), 105 - index)) // -1%/week

    expect(classifyE1rmTrend(rising, NOW)).toBe('rising')
    expect(classifyE1rmTrend(flat, NOW)).toBe('flat')
    expect(classifyE1rmTrend(declining, NOW)).toBe('declining')
  })

  it('ignores outlier points', () => {
    const points = [
      ...[35, 28, 21, 14, 7, 0].map((d) => point(daysAgo(d), 100)),
      point(daysAgo(3), 300, { outlier: true }),
    ]
    expect(classifyE1rmTrend(points, NOW)).toBe('flat')
  })
})

describe('detectStall', () => {
  it('is insufficient below 5 points', () => {
    const points = [28, 21, 14, 7].map((d, index) => point(daysAgo(d), 100 + index))
    expect(detectStall(points, NOW)).toEqual({ signal: 'insufficient', weeksSincePr: null, lastPrDate: null })
  })

  it('is progressing when the last PR was 2 weeks ago', () => {
    const points = [42, 35, 28, 21, 14].map((d, index) => point(daysAgo(d), 100 + index))
    expect(detectStall(points, NOW)).toEqual({ signal: 'progressing', weeksSincePr: 2, lastPrDate: daysAgo(14) })
  })

  it('is watch at exactly 3 weeks and at exactly 6 weeks since the PR', () => {
    const threeWeeks = [49, 42, 35, 28, 21].map((d, index) => point(daysAgo(d), 100 + index))
    expect(detectStall(threeWeeks, NOW)).toEqual({ signal: 'watch', weeksSincePr: 3, lastPrDate: daysAgo(21) })

    const sixWeeks = [70, 63, 56, 49, 42].map((d, index) => point(daysAgo(d), 100 + index))
    expect(detectStall(sixWeeks, NOW)).toEqual({ signal: 'watch', weeksSincePr: 6, lastPrDate: daysAgo(42) })
  })

  it('is stalled at 6 weeks + 1 day since the PR', () => {
    const points = [71, 64, 57, 50, 43].map((d, index) => point(daysAgo(d), 100 + index))
    expect(detectStall(points, NOW)).toEqual({ signal: 'stalled', weeksSincePr: 6, lastPrDate: daysAgo(43) })
  })

  it('does not count outlier points as PRs', () => {
    const points = [
      ...[71, 64, 57, 50, 43].map((d, index) => point(daysAgo(d), 100 + index)),
      point(daysAgo(7), 300, { outlier: true }),
    ]
    expect(detectStall(points, NOW)).toEqual({ signal: 'stalled', weeksSincePr: 6, lastPrDate: daysAgo(43) })
  })
})

describe('computeVelocity', () => {
  it('is null under 4 points or a 28-day span', () => {
    expect(computeVelocity([point(daysAgo(60), 100), point(daysAgo(30), 105), point(daysAgo(0), 110)], NOW)).toBeNull()
    expect(
      computeVelocity(
        [point(daysAgo(21), 100), point(daysAgo(14), 102), point(daysAgo(7), 104), point(daysAgo(0), 106)],
        NOW,
      ),
    ).toBeNull()
  })

  it('reports the per-month slope with correct sign and magnitude', () => {
    const days = [56, 42, 28, 14, 0]
    const gaining = days.map((d, index) => point(daysAgo(d), 100 + index * 2.5)) // +10 over 56 days
    const losing = days.map((d, index) => point(daysAgo(d), 110 - index * 2.5))

    expect(computeVelocity(gaining, NOW)).toBe(5.4) // 10/56 * 30.44 = 5.44/month
    expect(computeVelocity(losing, NOW)).toBe(-5.4)
  })
})

describe('buildPowerliftingTotal', () => {
  it('emits nothing until all three lifts have a point', () => {
    expect(
      buildPowerliftingTotal(
        [series('squat', [point(daysAgo(30), 100)]), series('bench_press', [point(daysAgo(30), 80)])],
        'kg',
      ),
    ).toEqual([])

    const totals = buildPowerliftingTotal(
      [
        series('squat', [point(daysAgo(30), 100), point(daysAgo(20), 105)]),
        series('bench_press', [point(daysAgo(20), 80)]),
        series('deadlift', [point(daysAgo(10), 120)]),
      ],
      'kg',
    )
    expect(totals).toEqual([{ date: daysAgo(10), total: 305, totalKg: 305 }])
  })

  it('is monotonic non-decreasing on best-so-far values', () => {
    const totals = buildPowerliftingTotal(
      [
        series('squat', [point(daysAgo(30), 100), point(daysAgo(20), 90)]),
        series('bench_press', [point(daysAgo(30), 80)]),
        series('deadlift', [point(daysAgo(30), 120), point(daysAgo(10), 130)]),
      ],
      'kg',
    )
    expect(totals.map((entry) => entry.total)).toEqual([300, 300, 310])
    expect(totals.map((entry) => entry.date)).toEqual([daysAgo(30), daysAgo(20), daysAgo(10)])
  })

  it('converts lb totals to kg', () => {
    const totals = buildPowerliftingTotal(
      [
        series('squat', [point(daysAgo(10), 300)]),
        series('bench_press', [point(daysAgo(10), 200)]),
        series('deadlift', [point(daysAgo(10), 400)]),
      ],
      'lb',
    )
    expect(totals[0].total).toBe(900)
    expect(totals[0].totalKg).toBeCloseTo(408.23, 2)
  })

  it('ignores outlier points', () => {
    const totals = buildPowerliftingTotal(
      [
        series('squat', [point(daysAgo(30), 100), point(daysAgo(10), 500, { outlier: true })]),
        series('bench_press', [point(daysAgo(30), 80)]),
        series('deadlift', [point(daysAgo(30), 120)]),
      ],
      'kg',
    )
    expect(totals).toEqual([{ date: daysAgo(30), total: 300, totalKg: 300 }])
  })
})

describe('labels', () => {
  it('maps every signal to copy', () => {
    expect(e1rmTrendLabels.rising).toBe('Trending up')
    expect(e1rmTrendLabels.detraining).toBe('Been a while')
    expect(stallSignalLabels.stalled).toBe('Stalled')
    expect(stallSignalLabels.insufficient).toBe('Building baseline')
  })
})
