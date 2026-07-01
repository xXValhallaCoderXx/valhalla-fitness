import { createServerFn } from '@tanstack/react-start'
import { type AuthPolicy, authDisabledResultMessage, getAuthPolicy } from '~/shared/lib/auth-config'
import { isEmailAllowed, normalizeEmail, resolveMagicLinkDecision } from './allowlist'

export type AuthUser = {
  id: string
  email: string | null
}

export type BrowserMagicLinkRequest = {
  email: string
  emailRedirectTo: string
  supabaseAnonKey: string
  supabaseUrl: string
  shouldCreateUser: boolean
}

export type MagicLinkResult =
  | {
      ok: true
      message: string
      browserRequest: BrowserMagicLinkRequest
    }
  | {
      ok: true
      message: string
      browserRequest?: undefined
    }
  | {
      ok: false
      message: string
    }

type BuildBrowserMagicLinkRequestOptions = {
  email: string
  origin: string
  supabaseAnonKey: string
  supabaseUrl: string
  shouldCreateUser: boolean
  message: string
}

async function hasSupabaseEnv() {
  const { hasSupabaseEnv } = await import('~/shared/server/supabase')
  return hasSupabaseEnv()
}

async function getSupabaseServerClient() {
  const { getSupabaseServerClient } = await import('~/shared/server/supabase')
  return getSupabaseServerClient()
}

async function getSupabasePublicConfig() {
  const { getSupabaseAnonKey, getSupabaseUrl } = await import('~/shared/server/supabase')
  const supabaseUrl = getSupabaseUrl()
  const supabaseAnonKey = getSupabaseAnonKey()

  if (!supabaseUrl || !supabaseAnonKey) return null
  return { supabaseUrl, supabaseAnonKey }
}

function buildBrowserMagicLinkRequest({
  email,
  origin,
  supabaseAnonKey,
  supabaseUrl,
  shouldCreateUser,
  message,
}: BuildBrowserMagicLinkRequestOptions): MagicLinkResult {
  return {
    ok: true,
    message,
    browserRequest: {
      email,
      emailRedirectTo: `${origin}/auth/callback`,
      supabaseAnonKey,
      supabaseUrl,
      shouldCreateUser,
    },
  }
}

function resolveServerAuthPolicy(): AuthPolicy {
  return getAuthPolicy({
    passwordEnabled: process.env.AUTH_PASSWORD_ENABLED,
    allowlistEnabled: process.env.AUTH_ALLOWLIST_ENABLED,
    nodeEnv: process.env.NODE_ENV,
  })
}

const AUTH_DISABLED_RESULT = { ok: false, message: authDisabledResultMessage } as const

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

export const getAuthPolicyFn = createServerFn({ method: 'GET' }).handler(async (): Promise<AuthPolicy> => {
  return resolveServerAuthPolicy()
})

export type BrowserOAuthRequest = {
  provider: 'google'
  supabaseUrl: string
  supabaseAnonKey: string
  redirectTo: string
}

export type OAuthStartResult =
  | { ok: true; browserRequest: BrowserOAuthRequest }
  | { ok: false; message: string }

/**
 * Start a Google OAuth sign-in. Mirrors {@link sendMagicLinkFn}: the server returns the public config
 * + redirect target and the browser replays it through an anon client's `signInWithOAuth`, so the
 * PKCE verifier is set by the same browser client that `/auth/callback` later exchanges. Whether
 * Google actually works is decided by Supabase (config.toml locally, the dashboard provider in prod).
 */
export const startGoogleSignInFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<OAuthStartResult> => {
    const config = await getSupabasePublicConfig()
    if (!config) return { ok: false, message: 'Supabase is not configured for Google sign-in.' }
    const origin = process.env.APP_ORIGIN ?? 'http://localhost:3000'
    return {
      ok: true,
      browserRequest: {
        provider: 'google',
        supabaseUrl: config.supabaseUrl,
        supabaseAnonKey: config.supabaseAnonKey,
        redirectTo: `${origin}/auth/callback`,
      },
    }
  },
)

export const signInWithPasswordFn = createServerFn({ method: 'POST' })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    if (!resolveServerAuthPolicy().passwordSignInEnabled) return AUTH_DISABLED_RESULT
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
    if (!resolveServerAuthPolicy().passwordSignUpEnabled) return AUTH_DISABLED_RESULT
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
  .handler(async ({ data }): Promise<MagicLinkResult> => {
    const policy = resolveServerAuthPolicy()
    const origin = process.env.APP_ORIGIN ?? 'http://localhost:3000'
    const config = await getSupabasePublicConfig()
    if (!config) return { ok: false, message: 'Supabase is not configured for magic links.' } as const

    const email = normalizeEmail(data.email)

    let isAllowed = true
    if (policy.magicLinkRequiresAllowlist) {
      const supabase = await getSupabaseServerClient()
      isAllowed = await isEmailAllowed(supabase, email)
    }

    const decision = resolveMagicLinkDecision(policy, isAllowed)
    if (!decision.sendLink) {
      // Neutral success, no browserRequest -> the browser never calls signInWithOtp.
      return { ok: true, message: decision.message }
    }

    return buildBrowserMagicLinkRequest({
      email,
      origin,
      shouldCreateUser: policy.magicLinkShouldCreateUser,
      message: decision.message,
      ...config,
    })
  })

export const resetPasswordFn = createServerFn({ method: 'POST' })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    if (!resolveServerAuthPolicy().passwordResetEnabled) return AUTH_DISABLED_RESULT
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
