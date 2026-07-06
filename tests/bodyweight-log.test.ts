import { describe, expect, it } from 'vitest'
import { normalizeBodyweightLog } from '../src/domains/account/server/bodyweight-functions'

const now = '2026-07-05T14:30:00.000Z'

describe('normalizeBodyweightLog', () => {
  it('passes kg through unchanged', () => {
    expect(normalizeBodyweightLog({ weight: 82.5, unit: 'kg', recordedOn: '2026-07-04' }, now)).toEqual({
      recordedOn: '2026-07-04',
      weightKg: 82.5,
    })
  })

  it('converts lb to canonical kg', () => {
    const { weightKg } = normalizeBodyweightLog({ weight: 220, unit: 'lb', recordedOn: '2026-07-04' }, now)
    expect(weightKg).toBeCloseTo(99.79, 2)
  })

  it('defaults recordedOn to the UTC date of now', () => {
    expect(normalizeBodyweightLog({ weight: 80, unit: 'kg' }, now).recordedOn).toBe('2026-07-05')
  })

  it('uses the UTC calendar date even when now is late evening in a western offset', () => {
    expect(normalizeBodyweightLog({ weight: 80, unit: 'kg' }, '2026-07-05T23:59:59.000Z').recordedOn).toBe('2026-07-05')
  })

  it('rejects weights at or below 20 kg', () => {
    expect(() => normalizeBodyweightLog({ weight: 20, unit: 'kg' }, now)).toThrow(/between 20 and 500 kg/)
    expect(() => normalizeBodyweightLog({ weight: 12, unit: 'kg' }, now)).toThrow(/between 20 and 500 kg/)
    // 44 lb ≈ 19.96 kg — the bound applies after conversion.
    expect(() => normalizeBodyweightLog({ weight: 44, unit: 'lb' }, now)).toThrow(/between 20 and 500 kg/)
  })

  it('rejects weights at or above 500 kg', () => {
    expect(() => normalizeBodyweightLog({ weight: 500, unit: 'kg' }, now)).toThrow(/between 20 and 500 kg/)
    expect(() => normalizeBodyweightLog({ weight: 1200, unit: 'lb' }, now)).toThrow(/between 20 and 500 kg/)
  })

  it('rejects non-finite weights', () => {
    expect(() => normalizeBodyweightLog({ weight: Number.NaN, unit: 'kg' }, now)).toThrow(/between 20 and 500 kg/)
  })

  it('rejects malformed recordedOn dates', () => {
    expect(() => normalizeBodyweightLog({ weight: 80, unit: 'kg', recordedOn: '05/07/2026' }, now)).toThrow(
      /YYYY-MM-DD/,
    )
    expect(() => normalizeBodyweightLog({ weight: 80, unit: 'kg', recordedOn: '2026-13-40' }, now)).toThrow(
      /YYYY-MM-DD/,
    )
  })
})
