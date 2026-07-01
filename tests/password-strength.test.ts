import { describe, expect, it } from 'vitest'
import { isValidEmail, scorePasswordStrength } from '../src/domains/account/lib/password-strength'

describe('scorePasswordStrength', () => {
  it('reports "Too short" for empty or sub-6-char input', () => {
    expect(scorePasswordStrength('')).toMatchObject({ score: 0, label: 'Too short', tone: 'danger', widthPct: 0 })
    expect(scorePasswordStrength('abc')).toMatchObject({ score: 0, label: 'Too short' })
  })

  it('scores a bare 6+ char password as Weak', () => {
    expect(scorePasswordStrength('abcdef')).toMatchObject({ score: 1, label: 'Weak', tone: 'danger' })
  })

  it('rewards length and a letter+digit mix', () => {
    expect(scorePasswordStrength('abc12345')).toMatchObject({ score: 2, label: 'Fair', tone: 'warning' })
    expect(scorePasswordStrength('abcdef1234')).toMatchObject({ score: 3, label: 'Good', tone: 'success' })
  })

  it('reaches Strong with length, letters, digits and a symbol', () => {
    expect(scorePasswordStrength('Abcdef123!')).toMatchObject({
      score: 4,
      label: 'Strong',
      tone: 'success',
      widthPct: 100,
    })
  })
})

describe('isValidEmail', () => {
  it('accepts well-formed addresses (trimming surrounding space)', () => {
    for (const email of ['a@b.co', 'name@example.com', ' name@example.com ']) {
      expect(isValidEmail(email)).toBe(true)
    }
  })

  it('rejects malformed addresses', () => {
    for (const email of ['', 'name', 'name@', 'name@example', 'a b@example.com', 'name@ex ample.com']) {
      expect(isValidEmail(email)).toBe(false)
    }
  })
})
