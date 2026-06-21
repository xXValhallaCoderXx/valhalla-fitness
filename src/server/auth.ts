import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient, hasSupabaseEnv } from './supabase'

export type AuthUser = {
  id: string
  email: string | null
}

export const fetchUserFn = createServerFn({ method: 'GET' }).handler(async () => {
  if (!hasSupabaseEnv()) return null
  let data
  try {
    const supabase = getSupabaseServerClient()
    const response = await supabase.auth.getUser()
    data = response.data
  } catch {
    return null
  }
  if (!data.user) return null
  return {
    id: data.user.id,
    email: data.user.email ?? null,
  } satisfies AuthUser
})

export const signInWithPasswordFn = createServerFn({ method: 'POST' })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    return error ? { ok: false, message: error.message } : { ok: true }
  })

export const signUpWithPasswordFn = createServerFn({ method: 'POST' })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })
    return error ? { ok: false, message: error.message } : { ok: true }
  })

export const sendMagicLinkFn = createServerFn({ method: 'POST' })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const origin = process.env.APP_ORIGIN ?? 'http://localhost:3000'
    const { error } = await supabase.auth.signInWithOtp({
      email: data.email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    })
    return error ? { ok: false, message: error.message } : { ok: true }
  })

export const resetPasswordFn = createServerFn({ method: 'POST' })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const origin = process.env.APP_ORIGIN ?? 'http://localhost:3000'
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${origin}/auth/callback`,
    })
    return error ? { ok: false, message: error.message } : { ok: true }
  })

export const exchangeCodeForSessionFn = createServerFn({ method: 'POST' })
  .validator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(data.code)
    return error ? { ok: false, message: error.message } : { ok: true }
  })

export const verifyEmailOtpFn = createServerFn({ method: 'POST' })
  .validator((data: { tokenHash: string; type: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.auth.verifyOtp({
      token_hash: data.tokenHash,
      type: data.type,
    })
    return error ? { ok: false, message: error.message } : { ok: true }
  })

export const setSessionFromTokensFn = createServerFn({ method: 'POST' })
  .validator((data: { accessToken: string; refreshToken: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.auth.setSession({
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
    })
    return error ? { ok: false, message: error.message } : { ok: true }
  })

export const signOutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const { error } = await supabase.auth.signOut()
  return error ? { ok: false, message: error.message } : { ok: true }
})
