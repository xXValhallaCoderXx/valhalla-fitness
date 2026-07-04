import { describe, expect, it } from 'vitest'
import {
  allFreshRecoveryLabel,
  calculateBodyLoad,
  recoverySummaryLine,
  resolveRegionWeights,
  worstBodyLoadTier,
} from '../src/domains/history/lib/body-load'
import type { BodyLoadRegion } from '../src/shared/types'

describe('body load model', () => {
  it('weights recent completed work by role and movement region', () => {
    const summary = calculateBodyLoad(
      [
        {
          movementId: 'bench_press',
          movementName: 'Bench Press',
          role: 'main',
          completedSets: 3,
          performedAt: '2026-06-22T10:00:00.000Z',
        },
        {
          movementId: 'barbell_row',
          movementName: 'Barbell Row',
          role: 'accessory',
          completedSets: 2,
          performedAt: '2026-06-21T10:00:00.000Z',
        },
      ],
      { now: new Date('2026-06-22T12:00:00.000Z') },
    )

    const chest = summary.regions.find((region) => region.regionId === 'chest')
    const upperBack = summary.regions.find((region) => region.regionId === 'upper_back')

    expect(chest?.score).toBe(4.5)
    expect(chest?.impactPercent).toBe(38)
    expect(upperBack?.score).toBe(1.1)
    expect(summary.topRegions[0]?.regionId).toBe('chest')
  })

  it('ignores work outside the body-load window', () => {
    const summary = calculateBodyLoad(
      [
        {
          movementId: 'squat',
          movementName: 'Squat',
          role: 'main',
          completedSets: 5,
          performedAt: '2026-06-10T10:00:00.000Z',
        },
      ],
      { now: new Date('2026-06-22T12:00:00.000Z') },
    )

    expect(summary.topRegions).toEqual([])
    expect(summary.freshRegionCount).toBe(summary.regions.length)
  })

  it('falls back to movement category when there is no explicit movement mapping', () => {
    expect(resolveRegionWeights('unknown_row', 'upper_back')).toMatchObject({
      upper_back: 0.7,
      biceps: 0.2,
    })
  })
})

function region(over: Partial<BodyLoadRegion> = {}): BodyLoadRegion {
  return {
    regionId: 'quads',
    label: 'Quads',
    score: 6,
    impactPercent: 50,
    tier: 'moderate',
    recentSetCount: 5,
    lastTrainedAt: '2026-06-22T12:00:00.000Z', // a Monday
    movementNames: ['Squat'],
    ...over,
  }
}

describe('worstBodyLoadTier', () => {
  it('returns the highest tier present', () => {
    expect(worstBodyLoadTier([region({ tier: 'low' }), region({ tier: 'high' }), region({ tier: 'moderate' })])).toBe('high')
    expect(worstBodyLoadTier([region({ tier: 'low' }), region({ tier: 'moderate' })])).toBe('moderate')
    expect(worstBodyLoadTier([region({ tier: 'low' })])).toBe('low')
  })

  it('is fresh for an empty list', () => {
    expect(worstBodyLoadTier([])).toBe('fresh')
  })
})

describe('recoverySummaryLine', () => {
  it('describes the most fatigued region with its tier phrase and weekday', () => {
    expect(recoverySummaryLine([region(), region({ regionId: 'glutes', label: 'Glutes', tier: 'low' })])).toBe(
      'Quads worked hard Mon',
    )
    expect(recoverySummaryLine([region({ tier: 'high' })])).toBe('Quads very fatigued Mon')
  })

  it('omits the weekday when the region has no usable trained-at date', () => {
    expect(recoverySummaryLine([region({ lastTrainedAt: null })])).toBe('Quads worked hard')
    expect(recoverySummaryLine([region({ lastTrainedAt: 'not-a-date' })])).toBe('Quads worked hard')
  })

  it('falls back to the all-fresh label when nothing was trained recently', () => {
    expect(recoverySummaryLine([])).toBe(allFreshRecoveryLabel)
  })
})
