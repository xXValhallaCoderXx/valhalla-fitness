import type { MagicLinkResult, OAuthStartResult } from '~/domains/account/server/auth-functions'

// PKCE writes the code-verifier as a host-scoped cookie in *this* browser, so the callback must
// return to the exact host the user is on. Derive it from window.location.origin rather than the
// server's APP_ORIGIN, which can point at a different host (e.g. the raw Railway domain vs. the
// canonical www domain) and would drop the verifier cookie -> "pkce code verifier not found".
export function browserAuthCallbackUrl() {
  return `${window.location.origin}/auth/callback`
}

/** Replay the server's magic-link request through an anon browser client (sets the PKCE verifier). */
export async function sendBrowserMagicLink(result: Extract<MagicLinkResult, { browserRequest: object }>) {
  const { createBrowserClient } = await import('@supabase/ssr')
  const { browserRequest } = result
  const supabase = createBrowserClient(browserRequest.supabaseUrl, browserRequest.supabaseAnonKey)
  const { error } = await supabase.auth.signInWithOtp({
    email: browserRequest.email,
    options: {
      emailRedirectTo: browserAuthCallbackUrl(),
      shouldCreateUser: browserRequest.shouldCreateUser,
    },
  })

  if (error) {
    return { ok: false, message: error.message } as const
  }

  return { ok: true, message: result.message } as const
}

/** Kick off Google OAuth from the browser so the PKCE verifier is set by the client /auth/callback exchanges. */
export async function startBrowserGoogleSignIn(result: Extract<OAuthStartResult, { ok: true }>) {
  const { createBrowserClient } = await import('@supabase/ssr')
  const { browserRequest } = result
  const supabase = createBrowserClient(browserRequest.supabaseUrl, browserRequest.supabaseAnonKey)
  const { error } = await supabase.auth.signInWithOAuth({
    provider: browserRequest.provider,
    options: { redirectTo: browserAuthCallbackUrl() },
  })
  // On success supabase-js redirects the browser to Google; only errors return here.
  return error ? ({ ok: false, message: error.message } as const) : ({ ok: true } as const)
}
