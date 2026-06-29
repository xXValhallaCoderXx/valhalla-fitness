type AuthEnvironment = {
  PROD: boolean
}

export type AuthPolicy = {
  passwordSignInEnabled: boolean
  passwordSignUpEnabled: boolean
  passwordResetEnabled: boolean
  magicLinkEnabled: boolean
  magicLinkRequiresBetaAccess: boolean
}

export const authDisabledResultMessage = 'Sign-in is disabled on this deployment.'
export const defaultMagicLinkSentMessage = 'Magic link sent. Check your email.'
export const betaMagicLinkMessage = "If you've been accepted into the beta, you'll receive an email."

/**
 * `import.meta.env.PROD` is a compile-time constant inlined into client and
 * server bundles. Passing env explicitly keeps production policy unit-testable
 * without requiring a production build.
 */
export function getAuthPolicy(env: AuthEnvironment = import.meta.env): AuthPolicy {
  const isProduction = Boolean(env.PROD)

  return {
    passwordSignInEnabled: !isProduction,
    passwordSignUpEnabled: !isProduction,
    passwordResetEnabled: !isProduction,
    magicLinkEnabled: true,
    magicLinkRequiresBetaAccess: isProduction,
  }
}
