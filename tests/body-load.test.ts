import { describe, expect, it } from 'vitest'
import { calculateBodyLoad, resolveRegionWeights } from '../src/domains/history/lib/body-load'

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
