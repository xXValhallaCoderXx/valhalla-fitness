import type { EmailOtpType } from '@supabase/supabase-js'

export type AuthCallbackPayload =
  | { kind: 'code'; code: string }
  | { kind: 'tokenHash'; tokenHash: string; type: EmailOtpType }
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  | { kind: 'error'; message: string }
  | { kind: 'empty' }

const otpTypes = new Set<EmailOtpType>([
  'email',
  'recovery',
  'invite',
  'email_change',
  'signup',
  'magiclink',
])

export function parseAuthCallbackUrl(url: string): AuthCallbackPayload {
  try {
    const parsed = new URL(url)
    const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''))
    const value = (key: string) => parsed.searchParams.get(key) ?? fragment.get(key)
    const error = value('error_description') ?? value('error')
    if (error) return { kind: 'error', message: error }
    const code = value('code')
    if (code) return { kind: 'code', code }
    const tokenHash = value('token_hash')
    const rawType = value('type')
    if (tokenHash && rawType && otpTypes.has(rawType as EmailOtpType)) {
      return { kind: 'tokenHash', tokenHash, type: rawType as EmailOtpType }
    }
    const accessToken = value('access_token')
    const refreshToken = value('refresh_token')
    if (accessToken && refreshToken) return { kind: 'tokens', accessToken, refreshToken }
    return { kind: 'empty' }
  } catch {
    return { kind: 'error', message: 'This sign-in link is malformed.' }
  }
}
