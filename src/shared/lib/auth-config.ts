/**
 * Whether public authentication (sign-in AND sign-up, including magic links and
 * password resets) is disabled.
 *
 * The hosted/production build is locked down: no new accounts and no new sign-ins.
 * `import.meta.env.PROD` is a compile-time constant inlined identically into the
 * client and server bundles, so the UI and the server functions agree and there is
 * no hydration mismatch. It is `false` under `vite dev`, so local development and
 * e2e tests keep working. Reading an existing session (fetchUser) and signing out
 * are intentionally NOT gated by this.
 */
export function isAuthDisabled(): boolean {
  return import.meta.env.PROD
}

/** User-facing copy for the locked-down state. */
export const authDisabledCopy = {
  title: 'Sign-in is disabled',
  subtitle:
    'Sheetless is currently private — new sign-ups and sign-ins are turned off on this deployment.',
  body: 'If you think you should have access, please reach out to the person who runs this instance.',
} as const
