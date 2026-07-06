import { describe, expect, it } from 'vitest'
import {
  INSIGHT_RANGES,
  RANGE_DAYS,
  filterToRange,
  insightRangeLabels,
  rangeSpanDays,
  rangeStart,
} from '../src/domains/history/lib/insight-ranges'
import type { InsightRange } from '../src/domains/history/lib/insight-ranges'

const NOW = '2026-07-05T12:00:00.000Z'

function datePoint(date: string, value = 0) {
  return { date, value }
}

function weekPoint(weekStart: string, volume = 0) {
  return { weekStart, volume }
}

describe('insight range constants', () => {
  it('exposes ranges, day spans, and labels in sync', () => {
    expect(INSIGHT_RANGES).toEqual(['8w', '3m', '1y', 'all'])
    for (const range of INSIGHT_RANGES) {
      expect(RANGE_DAYS[range] === null || RANGE_DAYS[range]! > 0).toBe(true)
      expect(insightRangeLabels[range]).toBeTruthy()
    }
    expect(RANGE_DAYS['8w']).toBe(56)
    expect(RANGE_DAYS.all).toBeNull()
    expect(insightRangeLabels.all).toBe('All')
  })
})

describe('rangeStart', () => {
  it('clamps finite ranges to the first data date with only 6 weeks of history', () => {
    const firstDataDate = '2026-05-24' // 42 days before NOW
    expect(rangeStart('1y', firstDataDate, NOW)).toBe('2026-05-24')
    expect(rangeStart('8w', firstDataDate, NOW)).toBe('2026-05-24')
    expect(rangeStart('all', firstDataDate, NOW)).toBe('2026-05-24')
  })

  it('uses now minus range days when history is longer than the window', () => {
    expect(rangeStart('8w', '2025-01-01', NOW)).toBe('2026-05-10')
    expect(rangeStart('3m', '2025-01-01', NOW)).toBe('2026-04-05')
  })

  it('returns null for all-time with no data, and the raw window without a first date', () => {
    expect(rangeStart('all', null, NOW)).toBeNull()
    expect(rangeStart('8w', null, NOW)).toBe('2026-05-10')
  })
})

describe('filterToRange', () => {
  it('drops points older than the 8w window and keeps the boundary date', () => {
    const items = [
      datePoint('2026-07-01'),
      datePoint('2026-05-10'), // exactly rangeStart — inclusive
      datePoint('2026-05-09'), // one day before — dropped
      datePoint('2026-01-15'),
    ]
    const result = filterToRange(items, '8w', {
      firstDataDate: '2025-01-01',
      now: NOW,
      getDate: (item) => item.date,
    })
    expect(result.map((item) => item.date)).toEqual(['2026-07-01', '2026-05-10'])
  })

  it('returns identical output for 1y and all when history is only 6 weeks', () => {
    const firstDataDate = '2026-05-24'
    const items = [
      datePoint('2026-05-24'),
      datePoint('2026-06-10'),
      datePoint('2026-07-04'),
    ]
    const options = { firstDataDate, now: NOW, getDate: (item: { date: string }) => item.date }
    const oneYear = filterToRange(items, '1y', options)
    const all = filterToRange(items, 'all', options)
    expect(oneYear).toEqual(all)
    expect(oneYear).toEqual(items)
  })

  it('returns items unchanged for all-time with no first data date', () => {
    const items = [datePoint('2020-01-01'), datePoint('2026-07-01')]
    const result = filterToRange(items, 'all', {
      firstDataDate: null,
      now: NOW,
      getDate: (item) => item.date,
    })
    expect(result).toBe(items)
  })

  it('handles empty item lists', () => {
    const ranges: InsightRange[] = ['8w', '3m', '1y', 'all']
    for (const range of ranges) {
      expect(
        filterToRange([], range, {
          firstDataDate: '2026-01-01',
          now: NOW,
          getDate: () => '2026-01-01',
        }),
      ).toEqual([])
    }
  })

  it('works with weekStart keys via the getDate accessor', () => {
    const weeks = [
      weekPoint('2026-06-29'),
      weekPoint('2026-05-11'),
      weekPoint('2026-05-04'), // before 2026-05-10 window start
    ]
    const result = filterToRange(weeks, '8w', {
      firstDataDate: '2025-06-01',
      now: NOW,
      getDate: (item) => item.weekStart,
    })
    expect(result.map((item) => item.weekStart)).toEqual(['2026-06-29', '2026-05-11'])
  })
})

describe('rangeSpanDays', () => {
  it('returns the full window when history exceeds it', () => {
    expect(rangeSpanDays('8w', '2025-01-01', NOW)).toBe(56)
    expect(rangeSpanDays('3m', '2025-01-01', NOW)).toBe(91)
    expect(rangeSpanDays('1y', '2025-01-01', NOW)).toBe(365)
  })

  it('clamps to the actual history length', () => {
    const firstDataDate = '2026-05-24' // 42 days of history
    expect(rangeSpanDays('1y', firstDataDate, NOW)).toBe(42)
    expect(rangeSpanDays('8w', firstDataDate, NOW)).toBe(42)
    expect(rangeSpanDays('all', firstDataDate, NOW)).toBe(42)
  })

  it('returns null for all-time with no data', () => {
    expect(rangeSpanDays('all', null, NOW)).toBeNull()
  })
})
