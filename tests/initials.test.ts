import { describe, expect, it } from 'vitest'
import { initialsFrom } from '../src/domains/account/lib/initials'

describe('initialsFrom', () => {
  it('uses first and last word of a multi-word display name', () => {
    expect(initialsFrom('Jane Doe', 'jane@example.com')).toBe('JD')
    expect(initialsFrom('Ana Maria da Silva', null)).toBe('AS')
  })

  it('uses a single letter for a one-word display name', () => {
    expect(initialsFrom('Jane', 'jane@example.com')).toBe('J')
  })

  it('uppercases and ignores surrounding/extra whitespace', () => {
    expect(initialsFrom('  jane   doe  ', null)).toBe('JD')
  })

  it('falls back to the first letter of the email when no display name', () => {
    expect(initialsFrom(null, 'renate@example.com')).toBe('R')
    expect(initialsFrom('', 'renate@example.com')).toBe('R')
    expect(initialsFrom('   ', 'renate@example.com')).toBe('R')
  })

  it('falls back to "?" when nothing is available', () => {
    expect(initialsFrom(null, null)).toBe('?')
    expect(initialsFrom(undefined, '')).toBe('?')
  })
})
