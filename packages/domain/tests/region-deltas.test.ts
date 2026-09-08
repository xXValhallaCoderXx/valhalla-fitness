import { describe, expect, it } from 'vitest'
import { buildRegionDeltas } from '../src/history/muscle-volume'
import type { WeeklyRegionSets } from '../src/history/types'

// Mondays. `now` sits inside the week beginning 2026-03-16, so the reference week — the last
// complete one — is 2026-03-09 and its baseline is 2026-03-02.
const NOW = '2026-03-18T10:00:00.000Z'
const REFERENCE_WEEK = '2026-03-09'
const BASELINE_WEEK = '2026-03-02'
const CURRENT_WEEK = '2026-03-16'

const week = (weekStart: string, regionSets: Record<string, number>): WeeklyRegionSets => ({
  weekStart,
  weekLabel: weekStart,
  regionSets,
  totalSets: Object.values(regionSets).reduce((sum, value) => sum + value, 0),
})

describe('buildRegionDeltas', () => {
  it('compares the last complete week against the one before it', () => {
    const result = buildRegionDeltas(
      [week(BASELINE_WEEK, { quads: 8 }), week(REFERENCE_WEEK, { quads: 12 })],
      NOW,
    )
    expect(result.reason).toBe('ok')
    expect(result.weekStart).toBe(REFERENCE_WEEK)
    expect(result.deltas).toEqual([{ regionId: 'quads', current: 12, previous: 8, delta: 4 }])
  })

  // The partial current week would read as a collapse for everybody on a Monday.
  it('ignores the current, incomplete week', () => {
    const result = buildRegionDeltas(
      [week(BASELINE_WEEK, { quads: 8 }), week(REFERENCE_WEEK, { quads: 12 }), week(CURRENT_WEEK, { quads: 1 })],
      NOW,
    )
    expect(result.deltas).toEqual([{ regionId: 'quads', current: 12, previous: 8, delta: 4 }])
  })

  // The whole point: buckets are sparse, so array position is not calendar position.
  it('treats a skipped week as zero rather than comparing non-adjacent weeks', () => {
    // Only the reference week has data; the week before it was a rest week and has no bucket.
    // A naive weekly[n] - weekly[n-1] would compare against January and report no change.
    const result = buildRegionDeltas(
      [week('2026-01-05', { quads: 12 }), week(REFERENCE_WEEK, { quads: 12 })],
      NOW,
    )
    expect(result.reason).toBe('ok')
    expect(result.deltas).toEqual([{ regionId: 'quads', current: 12, previous: 0, delta: 12 }])
  })

  it('reports a drop to zero when the reference week is the missing one', () => {
    const result = buildRegionDeltas([week(BASELINE_WEEK, { quads: 10 })], NOW)
    expect(result.deltas).toEqual([{ regionId: 'quads', current: 0, previous: 10, delta: -10 }])
  })

  it('omits regions that were untouched in both weeks', () => {
    const result = buildRegionDeltas(
      [week(BASELINE_WEEK, { quads: 8 }), week(REFERENCE_WEEK, { quads: 12, chest: 4 })],
      NOW,
    )
    expect(result.deltas.map((entry) => entry.regionId).sort()).toEqual(['chest', 'quads'])
  })

  it('says nothing when a comparison would mislead', () => {
    // Week 1, a deload, or a cold start — gating.suppressWeekComparison.
    const suppressed = buildRegionDeltas(
      [week(BASELINE_WEEK, { quads: 8 }), week(REFERENCE_WEEK, { quads: 12 })],
      NOW,
      { suppress: true },
    )
    expect(suppressed.reason).toBe('suppressed')
    expect(suppressed.deltas).toEqual([])

    const noHistory = buildRegionDeltas([], NOW)
    expect(noHistory.reason).toBe('no_prior_week')
    expect(noHistory.deltas).toEqual([])
  })

  it('keeps one decimal, since region sets are fractional', () => {
    const result = buildRegionDeltas(
      [week(BASELINE_WEEK, { quads: 8.25 }), week(REFERENCE_WEEK, { quads: 12.4 })],
      NOW,
    )
    expect(result.deltas[0]).toEqual({ regionId: 'quads', current: 12.4, previous: 8.3, delta: 4.1 })
  })
})
