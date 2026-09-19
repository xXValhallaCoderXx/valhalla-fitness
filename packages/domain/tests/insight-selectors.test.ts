import { describe, expect, it } from 'vitest'
import { selectScoreDelta, selectScoreReadings } from '@sheetless/domain/history/insight-selectors'
import type { HistoryInsights, TotalPoint } from '@sheetless/domain/history/types'

const TODAY = '2026-08-06'

function totalPoint(date: string, dots: number | null): TotalPoint {
  return { date, total: 450, totalKg: 450, bodyweightKg: 71, dots, bwMultiple: 6.3 }
}

/** Only the fields the score selectors read; the rest of the payload is irrelevant here. */
function insights(totalSeries: TotalPoint[]): HistoryInsights {
  return {
    today: TODAY,
    firstSessionDate: '2026-06-15',
    totalSeries,
    strengthScore: { kind: 'dots', value: 338.1, total: 450, totalKg: 450, bodyweightKg: 71, asOfDate: TODAY },
  } as unknown as HistoryInsights
}

const series = [
  totalPoint('2026-06-15', 318),
  totalPoint('2026-07-12', 329.8),
  totalPoint('2026-07-20', 333),
  totalPoint('2026-08-06', 338.1),
]

describe('selectScoreDelta', () => {
  // The figure sits under a range switch, so it has to answer "in this window".
  it('measures across the visible window, not all time', () => {
    expect(selectScoreDelta(insights(series), 'all')).toBe(20.1)
  })

  it('says nothing with fewer than two readings', () => {
    expect(selectScoreDelta(insights(series.slice(0, 1)), 'all')).toBeNull()
    expect(selectScoreDelta(insights([]), 'all')).toBeNull()
  })

  it('skips points the score could not be worked out for', () => {
    const withGaps = [totalPoint('2026-06-15', null), ...series.slice(1)]
    expect(selectScoreDelta(insights(withGaps), 'all')).toBe(8.3)
  })

  it('reports a decline as a negative', () => {
    expect(selectScoreDelta(insights([...series].reverse().map((point, index) =>
      totalPoint(series[index].date, point.dots))), 'all')).toBe(-20.1)
  })
})

describe('selectScoreReadings', () => {
  it('takes the ends and the middle', () => {
    expect(selectScoreReadings(insights(series), 'all')).toEqual([
      { date: '2026-06-15', value: 318 },
      { date: '2026-07-12', value: 329.8 },
      { date: '2026-08-06', value: 338.1 },
    ])
  })

  // Repeating the ends of a two-point series would read as four sessions, not two.
  it('never repeats a reading on a short series', () => {
    expect(selectScoreReadings(insights(series.slice(0, 2)), 'all')).toHaveLength(2)
    expect(selectScoreReadings(insights(series.slice(0, 1)), 'all')).toHaveLength(1)
    expect(selectScoreReadings(insights([]), 'all')).toEqual([])
  })
})
