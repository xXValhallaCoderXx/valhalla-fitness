import { describe, expect, it } from 'vitest'
import {
  BODY_LOAD_TIER_MAX,
  allFreshRecoveryLabel,
  bodyLoadCoverageNote,
  bodyLoadTierNote,
  bodyLoadWindowLabel,
  calculateBodyLoad,
  recoverySummaryLine,
  resolveRegionWeights,
  tierForImpact,
  untrainedRegions,
  worstBodyLoadTier,
} from '@sheetless/domain/history/body-load'
import type { BodyLoadRegion } from '@sheetless/domain/history/types'

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

  it('uses catalog muscle metadata for newly cataloged movements', () => {
    expect(resolveRegionWeights('standing_machine_calf_raise')).toEqual({
      calves: 1,
    })
    expect(resolveRegionWeights('hip_abduction_machine')).toEqual({
      glutes: 1,
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
    contributions: [],
    contributionCount: 0,
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

describe('body load coverage and tiers', () => {
  const region = (label: string, recentSetCount: number, impactPercent = 40) => ({
    regionId: label.toLowerCase() as never,
    label,
    score: impactPercent / 10,
    impactPercent,
    tier: tierForImpact(impactPercent),
    recentSetCount,
    movementNames: [],
    contributions: [],
    contributionCount: 0,
  })

  it('names what the programme never touches', () => {
    expect(untrainedRegions([region('Quads', 8), region('Calves', 0)])).toEqual(['Calves'])
  })

  // "Nothing logged" is the reading most likely to be mistaken for "recovered".
  it('says what the map is, and what it is missing', () => {
    expect(bodyLoadCoverageNote([region('Quads', 8)], 'full')).toBe(
      'Based on logged sets, not a recovery measurement.',
    )
    expect(bodyLoadCoverageNote([region('Quads', 8), region('Calves', 0)], 'full')).toContain(
      'Calves has no direct work',
    )
    expect(
      bodyLoadCoverageNote([region('Calves', 0), region('Biceps', 0), region('Core', 0)], 'full'),
    ).toContain('Calves, Biceps and 1 more have no direct work')
  })

  it('speaks plainly in Guided', () => {
    expect(bodyLoadCoverageNote([region('Quads', 8)], 'guided')).toContain('not how recovered you are')
  })

  it('states the bound a tier sits in', () => {
    expect(bodyLoadTierNote(region('Quads', 8, 0))).toContain('nothing logged')
    expect(bodyLoadTierNote(region('Quads', 8, 80))).toContain(`above ${BODY_LOAD_TIER_MAX.moderate} %`)
    expect(bodyLoadTierNote(region('Quads', 8, 40))).toContain(`${BODY_LOAD_TIER_MAX.low + 1}–${BODY_LOAD_TIER_MAX.moderate} %`)
  })

  it('labels the window the map covers', () => {
    expect(
      bodyLoadWindowLabel({ generatedAt: '2026-08-06T10:00:00.000Z', windowDays: 7, freshRegionCount: 0, regions: [], topRegions: [] }),
    ).toBe('31 Jul – 6 Aug')
  })
})
