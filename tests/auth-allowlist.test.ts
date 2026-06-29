import { describe, expect, it, vi } from 'vitest'
import { isEmailAllowed, normalizeEmail, resolveMagicLinkDecision } from '../src/domains/account/server/allowlist'
import { allowlistNeutralMessage, defaultMagicLinkSentMessage } from '../src/shared/lib/auth-config'

function rpcClient(response: { data: unknown; error: { message: string } | null }) {
  return { rpc: vi.fn(async () => response) }
}

describe('normalizeEmail', () => {
  it('trims surrounding space and lowercases', () => {
    expect(normalizeEmail('  Renate.Gouveia@GMAIL.com  ')).toBe('renate.gouveia@gmail.com')
  })
})

describe('resolveMagicLinkDecision', () => {
  it('sends with the default message when the allowlist is off', () => {
    expect(resolveMagicLinkDecision({ magicLinkRequiresAllowlist: false }, false)).toEqual({
      sendLink: true,
      message: defaultMagicLinkSentMessage,
    })
  })

  it('refuses a non-allowlisted email with a neutral message', () => {
    expect(resolveMagicLinkDecision({ magicLinkRequiresAllowlist: true }, false)).toEqual({
      sendLink: false,
      message: allowlistNeutralMessage,
    })
  })

  it('sends to an allowlisted email but keeps the same neutral message (anti-enumeration)', () => {
    expect(resolveMagicLinkDecision({ magicLinkRequiresAllowlist: true }, true)).toEqual({
      sendLink: true,
      message: allowlistNeutralMessage,
    })
  })
})

describe('isEmailAllowed', () => {
  it('calls the RPC with the normalized email and returns true', async () => {
    const client = rpcClient({ data: true, error: null })
    const allowed = await isEmailAllowed(client, '  Renate.Gouveia@GMAIL.com ')
    expect(client.rpc).toHaveBeenCalledWith('is_email_allowed', { check_email: 'renate.gouveia@gmail.com' })
    expect(allowed).toBe(true)
  })

  it('returns false when the RPC returns false or null', async () => {
    expect(await isEmailAllowed(rpcClient({ data: false, error: null }), 'a@b.com')).toBe(false)
    expect(await isEmailAllowed(rpcClient({ data: null, error: null }), 'a@b.com')).toBe(false)
  })

  it('throws when the RPC errors', async () => {
    await expect(isEmailAllowed(rpcClient({ data: null, error: { message: 'boom' } }), 'a@b.com')).rejects.toThrow(
      'boom',
    )
  })
})
