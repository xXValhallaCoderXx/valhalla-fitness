import { describe, expect, it, vi } from 'vitest'
import {
  getBetaMagicLinkAccess,
  normalizeBetaAccessEmail,
  sendBetaMagicLink,
} from '~/domains/account/server/beta-access'
import { betaMagicLinkMessage } from '~/shared/lib/auth-config'

describe('beta magic-link access', () => {
  it('normalizes submitted email before checking access', () => {
    expect(normalizeBetaAccessEmail('  Renate.Gouveia@GMAIL.com  ')).toBe('renate.gouveia@gmail.com')
    expect(getBetaMagicLinkAccess('  Renate.Gouveia@GMAIL.com  ')).toEqual({
      normalizedEmail: 'renate.gouveia@gmail.com',
      shouldSendMagicLink: true,
    })
  })

  it('does not call Supabase for non-allowlisted emails', async () => {
    const auth = {
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
    }

    await expect(
      sendBetaMagicLink({
        auth,
        email: 'someone@example.com',
        origin: 'https://sheetless.app',
      }),
    ).resolves.toEqual({ ok: true, message: betaMagicLinkMessage })
    expect(auth.signInWithOtp).not.toHaveBeenCalled()
  })

  it('sends a magic link for the allowlisted email', async () => {
    const auth = {
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
    }

    await expect(
      sendBetaMagicLink({
        auth,
        email: '  Renate.Gouveia@GMAIL.com  ',
        origin: 'https://sheetless.app',
      }),
    ).resolves.toEqual({ ok: true, message: betaMagicLinkMessage })
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'renate.gouveia@gmail.com',
      options: {
        emailRedirectTo: 'https://sheetless.app/auth/callback',
      },
    })
  })
})
