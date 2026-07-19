import { supabase } from './supabase'
import { parseAuthCallbackUrl } from './callback-payload'

export { parseAuthCallbackUrl, type AuthCallbackPayload } from './callback-payload'

export async function completeAuthCallback(url: string) {
  const payload = parseAuthCallbackUrl(url)
  if (payload.kind === 'error') throw new Error(payload.message)
  if (payload.kind === 'code') {
    const { error } = await supabase.auth.exchangeCodeForSession(payload.code)
    if (error) throw error
    return
  }
  if (payload.kind === 'tokenHash') {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: payload.tokenHash,
      type: payload.type,
    })
    if (error) throw error
    return
  }
  if (payload.kind === 'tokens') {
    const { error } = await supabase.auth.setSession({
      access_token: payload.accessToken,
      refresh_token: payload.refreshToken,
    })
    if (error) throw error
    return
  }
  const { data } = await supabase.auth.getSession()
  if (!data.session) throw new Error('This sign-in link is incomplete or has expired.')
}
