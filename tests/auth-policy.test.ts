import { describe, expect, it } from 'vitest'
import { getAuthPolicy, parseBooleanFlag } from '../src/shared/lib/auth-config'

describe('getAuthPolicy', () => {
  it('enables password and disables the allowlist by default (local/dev)', () => {
    const policy = getAuthPolicy()
    expect(policy.passwordSignInEnabled).toBe(true)
    expect(policy.passwordSignUpEnabled).toBe(true)
    expect(policy.passwordResetEnabled).toBe(true)
    expect(policy.magicLinkEnabled).toBe(true)
    expect(policy.magicLinkRequiresAllowlist).toBe(false)
    expect(policy.magicLinkShouldCreateUser).toBe(true)
  })

  it('disables password and requires the allowlist in production', () => {
    const policy = getAuthPolicy({ nodeEnv: 'production' })
    expect(policy.passwordSignInEnabled).toBe(false)
    expect(policy.passwordSignUpEnabled).toBe(false)
    expect(policy.passwordResetEnabled).toBe(false)
    expect(policy.magicLinkEnabled).toBe(true)
    expect(policy.magicLinkRequiresAllowlist).toBe(true)
    expect(policy.magicLinkShouldCreateUser).toBe(false)
  })

  it('lets an explicit flag re-enable password in production', () => {
    const policy = getAuthPolicy({ nodeEnv: 'production', passwordEnabled: 'true' })
    expect(policy.passwordSignInEnabled).toBe(true)
    // Allowlist still defaults on in production.
    expect(policy.magicLinkRequiresAllowlist).toBe(true)
    // Open password signup implies passwordless signup for allowed emails too.
    expect(policy.magicLinkShouldCreateUser).toBe(true)
  })

  it('lets an explicit flag enable the allowlist outside production', () => {
    const policy = getAuthPolicy({ nodeEnv: 'development', allowlistEnabled: '1' })
    expect(policy.magicLinkRequiresAllowlist).toBe(true)
    // Password (and with it signup) still defaults on outside production, so magic links
    // may create accounts for allowed emails.
    expect(policy.magicLinkShouldCreateUser).toBe(true)
    expect(policy.passwordSignInEnabled).toBe(true)
  })

  it('is invite-only when password is off and the allowlist is on', () => {
    const policy = getAuthPolicy({ nodeEnv: 'development', passwordEnabled: 'false', allowlistEnabled: '1' })
    expect(policy.magicLinkRequiresAllowlist).toBe(true)
    expect(policy.magicLinkShouldCreateUser).toBe(false)
  })

  it('allows open magic-link signup when the allowlist is explicitly off in production', () => {
    const policy = getAuthPolicy({ nodeEnv: 'production', allowlistEnabled: 'false' })
    expect(policy.passwordSignInEnabled).toBe(false)
    expect(policy.magicLinkRequiresAllowlist).toBe(false)
    expect(policy.magicLinkShouldCreateUser).toBe(true)
  })

  it('honours an explicit AUTH_PASSWORD_ENABLED=false in dev', () => {
    const policy = getAuthPolicy({ nodeEnv: 'development', passwordEnabled: 'false' })
    expect(policy.passwordSignInEnabled).toBe(false)
  })
})

describe('parseBooleanFlag', () => {
  it('parses truthy strings (case/space-insensitive)', () => {
    for (const value of ['1', 'true', 'TRUE', 'yes', 'on', ' On ']) {
      expect(parseBooleanFlag(value)).toBe(true)
    }
  })

  it('parses falsy strings', () => {
    for (const value of ['0', 'false', 'No', 'off']) {
      expect(parseBooleanFlag(value)).toBe(false)
    }
  })

  it('returns undefined for empty, unset, or unrecognised values', () => {
    expect(parseBooleanFlag('')).toBeUndefined()
    expect(parseBooleanFlag('   ')).toBeUndefined()
    expect(parseBooleanFlag(undefined)).toBeUndefined()
    expect(parseBooleanFlag('maybe')).toBeUndefined()
  })

  it('passes booleans through unchanged', () => {
    expect(parseBooleanFlag(true)).toBe(true)
    expect(parseBooleanFlag(false)).toBe(false)
  })
})
