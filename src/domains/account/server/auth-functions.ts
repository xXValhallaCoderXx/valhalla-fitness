import { createServerFn } from '@tanstack/react-start'

export type AuthUser = {
  id: string
  email: string | null
}

async function hasSupabaseEnv() {
  const { hasSupabaseEnv } = await import('~/shared/server/supabase')
  return hasSupabaseEnv()
}

async function getSupabaseServerClient() {
  const { getSupabaseServerClient } = await import('~/shared/server/supabase')
  return getSupabaseServerClient()
}

export const fetchUserFn = createServerFn({ method: 'GET' }).handler(async () => {
  if (!(await hasSupabaseEnv())) return null
  let data
  try {
    const supabase = await getSupabaseServerClient()
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
    const supabase = await getSupabaseServerClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    return error ? ({ ok: false, message: error.message } as const) : ({ ok: true } as const)
  })

export const signUpWithPasswordFn = createServerFn({ method: 'POST' })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const supabase = await getSupabaseServerClient()
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })
    return error
      ? ({ ok: false, message: error.message } as const)
      : ({
          ok: true,
          signedIn: Boolean(signUpData.session),
          needsEmailConfirmation: !signUpData.session,
        } as const)
  })

export const sendMagicLinkFn = createServerFn({ method: 'POST' })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    const supabase = await getSupabaseServerClient()
    const origin = process.env.APP_ORIGIN ?? 'http://localhost:3000'
    const { error } = await supabase.auth.signInWithOtp({
      email: data.email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    })
    return error ? ({ ok: false, message: error.message } as const) : ({ ok: true } as const)
  })

export const resetPasswordFn = createServerFn({ method: 'POST' })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    const supabase = await getSupabaseServerClient()
    const origin = process.env.APP_ORIGIN ?? 'http://localhost:3000'
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${origin}/auth/callback`,
    })
    return error ? ({ ok: false, message: error.message } as const) : ({ ok: true } as const)
  })

export const exchangeCodeForSessionFn = createServerFn({ method: 'POST' })
  .validator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    const supabase = await getSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(data.code)
    return error ? ({ ok: false, message: error.message } as const) : ({ ok: true } as const)
  })

export const verifyEmailOtpFn = createServerFn({ method: 'POST' })
  .validator((data: { tokenHash: string; type: string }) => data)
  .handler(async ({ data }) => {
    const supabase = await getSupabaseServerClient()
    const { error } = await supabase.auth.verifyOtp({
      token_hash: data.tokenHash,
      type: data.type,
    })
    return error ? ({ ok: false, message: error.message } as const) : ({ ok: true } as const)
  })

export const setSessionFromTokensFn = createServerFn({ method: 'POST' })
  .validator((data: { accessToken: string; refreshToken: string }) => data)
  .handler(async ({ data }) => {
    const supabase = await getSupabaseServerClient()
    const { error } = await supabase.auth.setSession({
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
    })
    return error ? ({ ok: false, message: error.message } as const) : ({ ok: true } as const)
  })

export const signOutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const supabase = await getSupabaseServerClient()
  const { error } = await supabase.auth.signOut()
  return error ? ({ ok: false, message: error.message } as const) : ({ ok: true } as const)
})
