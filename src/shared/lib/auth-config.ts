export type AuthPolicyEnv = {
  /** Raw AUTH_PASSWORD_ENABLED value (string from env or boolean). */
  passwordEnabled?: string | boolean | undefined
  /** Raw AUTH_ALLOWLIST_ENABLED value (string from env or boolean). */
  allowlistEnabled?: string | boolean | undefined
  /** Raw NODE_ENV value. */
  nodeEnv?: string | undefined
}

export type AuthPolicy = {
  passwordSignInEnabled: boolean
  passwordSignUpEnabled: boolean
  passwordResetEnabled: boolean
  magicLinkEnabled: boolean
  magicLinkRequiresAllowlist: boolean
  magicLinkShouldCreateUser: boolean
}

export const defaultMagicLinkSentMessage = 'Magic link sent. Check your email.'
export const authDisabledResultMessage = 'Password sign-in is disabled on this deployment.'
export const allowlistNeutralMessage = 'If your email is on the access list, a sign-in link is on its way.'

/** Parse a loose boolean env flag. Returns undefined for empty/unset/unrecognised values. */
export function parseBooleanFlag(value: string | boolean | undefined): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (value == null) return undefined
  const normalized = value.trim().toLowerCase()
  if (normalized === '') return undefined
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return undefined
}

/**
 * Resolve the deployment's auth policy. Pure and isomorphic (no process.env /
 * import.meta.env), so it is unit-testable and safe in both bundles.
 *
 * Defaults derive from NODE_ENV but each is explicitly overridable:
 * - password flows: enabled unless production (override with AUTH_PASSWORD_ENABLED)
 * - magic-link allowlist: required in production (override with AUTH_ALLOWLIST_ENABLED)
 */
export function getAuthPolicy(env: AuthPolicyEnv = {}): AuthPolicy {
  const isProduction = (env.nodeEnv ?? 'development').toLowerCase() === 'production'
  const passwordEnabled = parseBooleanFlag(env.passwordEnabled) ?? !isProduction
  const allowlistEnabled = parseBooleanFlag(env.allowlistEnabled) ?? isProduction
  return {
    passwordSignInEnabled: passwordEnabled,
    passwordSignUpEnabled: passwordEnabled,
    passwordResetEnabled: passwordEnabled,
    magicLinkEnabled: true,
    magicLinkRequiresAllowlist: allowlistEnabled,
    // A deployment with open password signup lets magic links create accounts too (the signup
    // form offers a passwordless option). Otherwise creation is allowed only when no allowlist
    // gates sign-in — invite-only deployments must pre-provision accounts.
    magicLinkShouldCreateUser: passwordEnabled || !allowlistEnabled,
  }
}
