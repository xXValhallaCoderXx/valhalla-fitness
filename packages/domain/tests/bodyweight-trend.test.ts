import { describe, expect, it } from 'vitest'
import { buildBodyweightTrend } from '../src/history/bodyweight-trend'
import { convertWeight } from '../src/shared/math'

const entry = (recordedOn: string, weightKg: number) => ({ id: recordedOn, recordedOn, weightKg })
const base = { range: '8w' as const, today: '2026-09-05', units: 'kg' as const }

describe('actual bodyweight trend', () => {
  it('sorts, excludes future readings, includes the range boundary, and preserves calendar gaps', () => {
    const result = buildBodyweightTrend({ ...base, entries: [
      entry('2026-09-05', 81), entry('2026-07-10', 78), entry('2026-09-06', 90),
      entry('2026-07-11', 80), entry('2026-07-12', 80.5),
    ] })
    expect(result.points.map((point) => point.date)).toEqual(['2026-07-11', '2026-07-12', '2026-09-05'])
    expect(result.points[1].x - result.points[0].x).toBe(86400000)
    expect(result.latest?.value).toBe(81)
    expect(result.change).toBe(1)
    expect(result.count).toBe(3)
  })
  it('keeps an old latest reading visible outside the selected range', () => {
    const result = buildBodyweightTrend({ ...base, entries: [entry('2025-01-01', 80)] })
    expect(result.latest?.date).toBe('2025-01-01')
    expect(result.latestOutsideRange).toBe(true)
    expect(result.points).toEqual([])
    expect(result.change).toBeNull()
    expect(buildBodyweightTrend({ ...base, range: 'all', entries: [entry('2025-01-01', 80)] }).count).toBe(1)
  })
  it('handles empty, single, unchanged, and declining measurements without a goal or tone', () => {
    expect(buildBodyweightTrend({ ...base, entries: [] })).toMatchObject({ latest: null, count: 0, change: null })
    expect(buildBodyweightTrend({ ...base, entries: [entry(base.today, 80)] }).change).toBeNull()
    expect(buildBodyweightTrend({ ...base, entries: [entry('2026-09-01', 80), entry(base.today, 80)] }).change).toBe(0)
    expect(buildBodyweightTrend({ ...base, entries: [entry('2026-09-01', 81), entry(base.today, 80)] }).change).toBe(-1)
  })
  it('converts using account units and subtracts before rounding', () => {
    const result = buildBodyweightTrend({ ...base, units: 'lb', entries: [entry('2026-09-01', 80.04), entry(base.today, 80.08)] })
    expect(result.change).toBeCloseTo(convertWeight(0.04, 'kg', 'lb'), 8)
    expect(result.latest?.value).toBeCloseTo(convertWeight(80.08, 'kg', 'lb'), 8)
  })
})
