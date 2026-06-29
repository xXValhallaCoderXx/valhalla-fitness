import { describe, expect, it } from 'vitest'
import {
  availableIntensities,
  bestSetAccent,
  bestSetTagLabel,
  buildVolumeSeries,
  filterMovements,
  filterSessionsByIntensity,
  groupBestSets,
  intensityColor,
  movementCategories,
  sortMovementSummaries,
} from '../src/domains/history/lib/insights'
import type {
  HistoryBestSet,
  HistoryMovementSummary,
  HistoryWeeklyVolume,
  RecentHistoryEntry,
} from '../src/shared/types'

function bestSet(partial: Partial<HistoryBestSet> & { type: HistoryBestSet['type'] }): HistoryBestSet {
  return {
    id: partial.id ?? `set-${partial.type}`,
    movementId: partial.movementId ?? `mv-${partial.type}`,
    movementName: partial.movementName ?? 'Movement',
    role: partial.role ?? 'main',
    type: partial.type,
    load: partial.load ?? 100,
    reps: partial.reps ?? 5,
    rir: partial.rir ?? 1,
    e1rm: partial.e1rm ?? 120,
    volume: partial.volume ?? 500,
    sessionId: partial.sessionId ?? 'session-1',
    sessionTitle: partial.sessionTitle ?? 'Session',
    performedAt: partial.performedAt ?? '2026-06-20',
    units: partial.units ?? 'kg',
  }
}

function movement(partial: Partial<HistoryMovementSummary> & { movementName: string }): HistoryMovementSummary {
  return {
    movementId: partial.movementId ?? partial.movementName,
    movementName: partial.movementName,
    category: partial.category ?? 'quads',
    lastPerformedAt: partial.lastPerformedAt ?? null,
    totalCompletedSets: partial.totalCompletedSets ?? 0,
    totalVolume: partial.totalVolume ?? 0,
    substitutionCount: partial.substitutionCount ?? 0,
    bestSet: partial.bestSet ?? null,
  }
}

function week(weekStart: string, volume: number): HistoryWeeklyVolume {
  return { weekStart, weekLabel: weekStart.slice(5), volume, completedSets: 10, sessionCount: 3 }
}

function session(partial: Partial<RecentHistoryEntry> & { id: string }): RecentHistoryEntry {
  return {
    id: partial.id,
    title: partial.title ?? 'Session',
    completedAt: partial.completedAt ?? '2026-06-20',
    scheduledDate: partial.scheduledDate ?? '2026-06-20',
    hardness: partial.hardness ?? 'Medium',
    movementCount: partial.movementCount ?? 4,
    completedSetCount: partial.completedSetCount ?? 12,
    plannedSetCount: partial.plannedSetCount ?? 15,
  }
}

describe('groupBestSets', () => {
  it('groups by type into Top-set / Volume / Accessory in order, folding amrap into top-set', () => {
    const sets = [
      bestSet({ type: 'volume', id: 'v1' }),
      bestSet({ type: 'amrap', id: 'a1' }),
      bestSet({ type: 'accessory', id: 'x1' }),
      bestSet({ type: 'top_set', id: 't1' }),
    ]
    const groups = groupBestSets(sets)

    expect(groups.map((group) => group.key)).toEqual(['top', 'volume', 'accessory'])
    expect(groups[0].items.map((set) => set.id)).toEqual(['a1', 't1'])
    expect(groups[1].items.map((set) => set.id)).toEqual(['v1'])
    expect(groups[2].items.map((set) => set.id)).toEqual(['x1'])
  })

  it('drops empty groups', () => {
    const groups = groupBestSets([bestSet({ type: 'accessory' })])
    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe('accessory')
  })
})

describe('best set labels / accents', () => {
  it('labels and accents each type', () => {
    expect(bestSetTagLabel('amrap')).toBe('AMRAP')
    expect(bestSetTagLabel('top_set')).toBe('Top set')
    expect(bestSetAccent('amrap')).toBe('action')
    expect(bestSetAccent('volume')).toBe('accent')
    expect(bestSetAccent('accessory')).toBe('warning')
  })
})

describe('movement table helpers', () => {
  const rows = [
    movement({ movementName: 'Squat', category: 'quads', totalVolume: 3000, totalCompletedSets: 20, lastPerformedAt: '2026-06-26', bestSet: bestSet({ type: 'top_set', e1rm: 200 }) }),
    movement({ movementName: 'Bench Press', category: 'chest', totalVolume: 1500, totalCompletedSets: 15, lastPerformedAt: '2026-06-28', bestSet: bestSet({ type: 'top_set', e1rm: 120 }) }),
    movement({ movementName: 'Curl', category: 'biceps', totalVolume: 800, totalCompletedSets: 9, lastPerformedAt: '2026-06-20', bestSet: null }),
  ]

  it('lists unique sorted categories', () => {
    expect(movementCategories(rows)).toEqual(['biceps', 'chest', 'quads'])
  })

  it('filters by query and category', () => {
    expect(filterMovements(rows, 'ben', null).map((row) => row.movementName)).toEqual(['Bench Press'])
    expect(filterMovements(rows, '', 'quads').map((row) => row.movementName)).toEqual(['Squat'])
    expect(filterMovements(rows, 'chest', null).map((row) => row.movementName)).toEqual(['Bench Press'])
  })

  it('sorts by volume / e1rm / sets / last in both directions', () => {
    expect(sortMovementSummaries(rows, 'volume', 'desc').map((row) => row.movementName)).toEqual(['Squat', 'Bench Press', 'Curl'])
    expect(sortMovementSummaries(rows, 'volume', 'asc').map((row) => row.movementName)).toEqual(['Curl', 'Bench Press', 'Squat'])
    expect(sortMovementSummaries(rows, 'e1rm', 'desc')[0].movementName).toBe('Squat')
    expect(sortMovementSummaries(rows, 'sets', 'desc')[0].movementName).toBe('Squat')
    expect(sortMovementSummaries(rows, 'last', 'desc')[0].movementName).toBe('Bench Press')
  })

  it('does not mutate the input array', () => {
    const original = [...rows]
    sortMovementSummaries(rows, 'volume', 'asc')
    expect(rows).toEqual(original)
  })
})

describe('buildVolumeSeries', () => {
  it('scales volumes into bounded, left-to-right points with a closed area path', () => {
    const series = buildVolumeSeries([week('2026-06-01', 10), week('2026-06-08', 20), week('2026-06-15', 30), week('2026-06-22', 40)], {
      width: 100,
      height: 50,
    })

    expect(series.points).toHaveLength(4)
    expect(series.total).toBe(100)
    const xs = series.points.map((point) => point.x)
    expect(xs).toEqual([...xs].sort((a, b) => a - b))
    expect(xs[0]).toBe(0)
    expect(xs[xs.length - 1]).toBe(100)
    for (const point of series.points) {
      expect(point.y).toBeGreaterThanOrEqual(0)
      expect(point.y).toBeLessThanOrEqual(50)
    }
    expect(series.points[3].y).toBe(0) // max volume sits at the top
    expect(series.linePath.startsWith('M')).toBe(true)
    expect(series.areaPath.endsWith('Z')).toBe(true)
    expect(series.trendPercent).toBeCloseTo(33.33, 1)
  })

  it('centers a single point and reports no trend', () => {
    const series = buildVolumeSeries([week('2026-06-22', 25)], { width: 100, height: 50 })
    expect(series.points).toHaveLength(1)
    expect(series.points[0].x).toBe(50)
    expect(series.trendPercent).toBeNull()
  })

  it('handles an empty series without NaNs', () => {
    const series = buildVolumeSeries([], { width: 100, height: 50 })
    expect(series.points).toEqual([])
    expect(series.linePath).toBe('')
    expect(series.areaPath).toBe('')
    expect(series.total).toBe(0)
    expect(series.trendPercent).toBeNull()
  })

  it('reports a negative trend when the latest week drops', () => {
    const series = buildVolumeSeries([week('2026-06-15', 40), week('2026-06-22', 30)], { width: 100, height: 50 })
    expect(series.trendPercent).toBeLessThan(0)
  })
})

describe('session intensity', () => {
  it('maps hardness to the shared palette (Light=success)', () => {
    expect(intensityColor('Light')).toBe('success')
    expect(intensityColor('Medium')).toBe('warning')
    expect(intensityColor('Hard')).toBe('danger')
    expect(intensityColor('Deload')).toBe('action')
    expect(intensityColor(null)).toBe('neutral')
  })

  it('lists only the intensities present, in canonical order', () => {
    const sessions = [session({ id: 's1', hardness: 'Hard' }), session({ id: 's2', hardness: 'Light' }), session({ id: 's3', hardness: 'Hard' })]
    expect(availableIntensities(sessions)).toEqual(['Light', 'Hard'])
  })

  it('filters sessions by intensity', () => {
    const sessions = [session({ id: 's1', hardness: 'Hard' }), session({ id: 's2', hardness: 'Light' })]
    expect(filterSessionsByIntensity(sessions, 'all')).toHaveLength(2)
    expect(filterSessionsByIntensity(sessions, 'Hard').map((entry) => entry.id)).toEqual(['s1'])
  })
})
