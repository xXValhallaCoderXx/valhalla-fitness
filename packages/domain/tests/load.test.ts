import { describe, expect, it } from 'vitest'
import { externalLoadOrNull, isPositiveLoad } from '@sheetless/domain/shared/load'

describe('external load semantics', () => {
  it('accepts finite positive external resistance', () => {
    expect(isPositiveLoad(12.5)).toBe(true)
    expect(externalLoadOrNull(12.5)).toBe(12.5)
  })

  it.each([0, -5, null, undefined, Number.NaN, Number.POSITIVE_INFINITY])(
    'normalizes %s to loadless',
    (value) => {
      expect(isPositiveLoad(value)).toBe(false)
      expect(externalLoadOrNull(value)).toBeNull()
    },
  )
})
