import { describe, expect, it } from 'vitest'
import {
  DOTS_BW_CLAMP_KG,
  DOTS_COEFFICIENTS,
  bodyweightMultiple,
  decorateTotalPoints,
  dotsScore,
  nearestBodyweight,
  resolveStrengthScore,
  strengthScoreKindLabels,
} from '../src/domains/history/lib/dots'
import type { BodyweightEntry, StrengthScoreKind, TotalPoint } from '../src/shared/types'

function bwEntry(partial: Partial<BodyweightEntry> = {}): BodyweightEntry {
  return {
    id: partial.id ?? 'bw-1',
    recordedOn: partial.recordedOn ?? '2026-07-01',
    weightKg: partial.weightKg ?? 80,
  }
}

function totalPoint(
  partial: Partial<Pick<TotalPoint, 'date' | 'total' | 'totalKg'>> = {},
): Pick<TotalPoint, 'date' | 'total' | 'totalKg'> {
  return {
    date: partial.date ?? '2026-07-01',
    total: partial.total ?? 400,
    totalKg: partial.totalKg ?? 400,
  }
}

describe('dotsScore', () => {
  // Reference values computed directly from the DOTS polynomial:
  // denominator = A + B·bw + C·bw² + D·bw³ + E·bw⁴; score = totalKg × 500 / denominator.
  it('matches polynomial reference values', () => {
    expect(dotsScore(500, 100, 'male')).toBeCloseTo(307.8, 1)
    expect(dotsScore(500, 82.5, 'male')).toBeCloseTo(338.7, 1)
    expect(dotsScore(300, 60, 'female')).toBeCloseTo(332.6, 1)
  })

  it('scores lower at higher bodyweight for the same total', () => {
    expect(dotsScore(500, 100, 'male')).toBeLessThan(dotsScore(500, 82.5, 'male'))
    expect(dotsScore(300, 75, 'female')).toBeLessThan(dotsScore(300, 60, 'female'))
  })

  it('clamps bodyweight below the minimum', () => {
    expect(dotsScore(500, 30, 'male')).toBe(dotsScore(500, 40, 'male'))
    expect(dotsScore(300, 30, 'female')).toBe(dotsScore(300, 40, 'female'))
  })

  it('clamps bodyweight above the maximum', () => {
    expect(dotsScore(500, 250, 'male')).toBe(dotsScore(500, 210, 'male'))
    expect(dotsScore(300, 200, 'female')).toBe(dotsScore(300, 150, 'female'))
  })

  it('returns 0 for non-positive inputs', () => {
    expect(dotsScore(0, 100, 'male')).toBe(0)
    expect(dotsScore(-500, 100, 'male')).toBe(0)
    expect(dotsScore(500, 0, 'male')).toBe(0)
    expect(dotsScore(500, -80, 'female')).toBe(0)
  })

  it('exposes coefficient and clamp tables per sex', () => {
    expect(DOTS_COEFFICIENTS.male).toHaveLength(5)
    expect(DOTS_COEFFICIENTS.female).toHaveLength(5)
    expect(DOTS_BW_CLAMP_KG.male).toEqual([40, 210])
    expect(DOTS_BW_CLAMP_KG.female).toEqual([40, 150])
  })
})

describe('bodyweightMultiple', () => {
  it('rounds to 2 decimals', () => {
    expect(bodyweightMultiple(500, 82.5)).toBe(6.06)
    expect(bodyweightMultiple(500, 80)).toBe(6.25)
  })

  it('returns 0 for non-positive inputs', () => {
    expect(bodyweightMultiple(0, 80)).toBe(0)
    expect(bodyweightMultiple(500, 0)).toBe(0)
  })
})

describe('nearestBodyweight', () => {
  it('returns null for an empty list', () => {
    expect(nearestBodyweight([], '2026-07-01')).toBeNull()
  })

  it('returns the exact-date entry when one exists', () => {
    const entries = [
      bwEntry({ id: 'a', recordedOn: '2026-06-28' }),
      bwEntry({ id: 'b', recordedOn: '2026-07-01' }),
      bwEntry({ id: 'c', recordedOn: '2026-07-04' }),
    ]
    expect(nearestBodyweight(entries, '2026-07-01')?.id).toBe('b')
  })

  it('picks the entry with the smallest day delta', () => {
    const entries = [
      bwEntry({ id: 'a', recordedOn: '2026-06-20' }),
      bwEntry({ id: 'b', recordedOn: '2026-07-04' }),
    ]
    expect(nearestBodyweight(entries, '2026-07-01')?.id).toBe('b')
  })

  it('prefers the earlier entry on a tie', () => {
    const entries = [
      bwEntry({ id: 'a', recordedOn: '2026-07-01' }),
      bwEntry({ id: 'b', recordedOn: '2026-07-05' }),
    ]
    expect(nearestBodyweight(entries, '2026-07-03')?.id).toBe('a')
  })

  it('ignores the time component of a full ISO timestamp', () => {
    const entries = [
      bwEntry({ id: 'a', recordedOn: '2026-07-01' }),
      bwEntry({ id: 'b', recordedOn: '2026-07-05' }),
    ]
    expect(nearestBodyweight(entries, '2026-07-03T23:59:00.000Z')?.id).toBe('a')
  })
})

describe('decorateTotalPoints', () => {
  it('pairs each point with the nearest bodyweight and computes dots + multiple', () => {
    const entries = [
      bwEntry({ id: 'a', recordedOn: '2026-06-01', weightKg: 100 }),
      bwEntry({ id: 'b', recordedOn: '2026-07-01', weightKg: 82.5 }),
    ]
    const [first, second] = decorateTotalPoints(
      [totalPoint({ date: '2026-06-02', totalKg: 500, total: 500 }), totalPoint({ date: '2026-07-01', totalKg: 500, total: 500 })],
      entries,
      'male',
    )
    expect(first.bodyweightKg).toBe(100)
    expect(first.dots).toBeCloseTo(307.8, 1)
    expect(first.bwMultiple).toBe(5)
    expect(second.bodyweightKg).toBe(82.5)
    expect(second.dots).toBeCloseTo(338.7, 1)
    expect(second.bwMultiple).toBe(6.06)
  })

  it('computes bwMultiple but not dots when sex is null', () => {
    const [point] = decorateTotalPoints(
      [totalPoint({ totalKg: 500 })],
      [bwEntry({ weightKg: 100 })],
      null,
    )
    expect(point.bodyweightKg).toBe(100)
    expect(point.dots).toBeNull()
    expect(point.bwMultiple).toBe(5)
  })

  it('nulls all derived fields when there are no bodyweight entries', () => {
    const [point] = decorateTotalPoints([totalPoint()], [], 'male')
    expect(point.bodyweightKg).toBeNull()
    expect(point.dots).toBeNull()
    expect(point.bwMultiple).toBeNull()
  })
})

describe('resolveStrengthScore', () => {
  const full = {
    total: 1100,
    totalKg: 500,
    bodyweightKg: 100,
    sex: 'male' as const,
    asOfDate: '2026-07-01',
  }

  it('resolves dots when total, bodyweight and sex are present', () => {
    const score = resolveStrengthScore(full)
    expect(score.kind).toBe('dots')
    expect(score.value).toBeCloseTo(307.8, 1)
    expect(score.asOfDate).toBe('2026-07-01')
  })

  it('falls back to bw_multiple without sex', () => {
    const score = resolveStrengthScore({ ...full, sex: null })
    expect(score.kind).toBe('bw_multiple')
    expect(score.value).toBe(5)
  })

  it('falls back to total without bodyweight, using display units', () => {
    const score = resolveStrengthScore({ ...full, bodyweightKg: null, sex: null })
    expect(score.kind).toBe('total')
    expect(score.value).toBe(1100)
  })

  it('resolves insufficient without a total', () => {
    const score = resolveStrengthScore({ total: null, totalKg: null, bodyweightKg: 100, sex: 'male', asOfDate: null })
    expect(score.kind).toBe('insufficient')
    expect(score.value).toBeNull()
  })

  it('passes input fields through to the result', () => {
    const score = resolveStrengthScore(full)
    expect(score.total).toBe(1100)
    expect(score.totalKg).toBe(500)
    expect(score.bodyweightKg).toBe(100)
  })
})

describe('strengthScoreKindLabels', () => {
  it('labels every kind', () => {
    const kinds: StrengthScoreKind[] = ['dots', 'bw_multiple', 'total', 'insufficient']
    for (const kind of kinds) {
      expect(strengthScoreKindLabels[kind]).toBeTruthy()
    }
    expect(strengthScoreKindLabels.dots).toBe('DOTS')
  })
})
