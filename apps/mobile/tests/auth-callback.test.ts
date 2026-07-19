import { parseAuthCallbackUrl } from '@/auth/callback-payload'

describe('native auth callback parsing', () => {
  it('handles PKCE codes and token hashes', () => {
    expect(parseAuthCallbackUrl('sheetless://auth/callback?code=pkce-code')).toEqual({ kind: 'code', code: 'pkce-code' })
    expect(parseAuthCallbackUrl('sheetless://auth/callback?token_hash=hash&type=magiclink')).toEqual({
      kind: 'tokenHash',
      tokenHash: 'hash',
      type: 'magiclink',
    })
  })

  it('handles legacy token fragments and expired-link errors', () => {
    expect(parseAuthCallbackUrl('sheetless://auth/callback#access_token=access&refresh_token=refresh')).toEqual({
      kind: 'tokens',
      accessToken: 'access',
      refreshToken: 'refresh',
    })
    expect(parseAuthCallbackUrl('sheetless://auth/callback?error_description=Link%20expired')).toEqual({
      kind: 'error',
      message: 'Link expired',
    })
  })
})
