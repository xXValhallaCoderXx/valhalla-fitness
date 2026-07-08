import { describe, expect, it } from 'vitest'
import {
  REFLECTION_MAX_LENGTH,
  normalizeReflection,
  normalizeSessionRpe,
} from '../src/domains/session/lib/session-reflection'

describe('normalizeSessionRpe', () => {
  it('accepts whole numbers 1 through 10', () => {
    expect(normalizeSessionRpe(1)).toBe(1)
    expect(normalizeSessionRpe(7)).toBe(7)
    expect(normalizeSessionRpe(10)).toBe(10)
  })

  it('rejects out-of-range, fractional, and non-numeric input instead of clamping', () => {
    expect(normalizeSessionRpe(0)).toBeNull()
    expect(normalizeSessionRpe(11)).toBeNull()
    expect(normalizeSessionRpe(5.5)).toBeNull()
    expect(normalizeSessionRpe('7')).toBeNull()
    expect(normalizeSessionRpe(Number.NaN)).toBeNull()
    expect(normalizeSessionRpe(null)).toBeNull()
    expect(normalizeSessionRpe(undefined)).toBeNull()
  })
})

describe('normalizeReflection', () => {
  it('trims whitespace and rejects empty results', () => {
    expect(normalizeReflection('  hit every top set  ')).toBe('hit every top set')
    expect(normalizeReflection('   ')).toBeNull()
    expect(normalizeReflection('')).toBeNull()
  })

  it('rejects non-string input', () => {
    expect(normalizeReflection(7)).toBeNull()
    expect(normalizeReflection(null)).toBeNull()
    expect(normalizeReflection(undefined)).toBeNull()
  })

  it('caps runaway input at the max length', () => {
    const long = 'a'.repeat(REFLECTION_MAX_LENGTH + 50)
    expect(normalizeReflection(long)).toHaveLength(REFLECTION_MAX_LENGTH)
  })
})
