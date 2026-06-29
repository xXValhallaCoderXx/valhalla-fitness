import { allowlistNeutralMessage, defaultMagicLinkSentMessage, type AuthPolicy } from '~/shared/lib/auth-config'

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export type MagicLinkDecision = {
  /** Whether to hand the browser a signInWithOtp request. */
  sendLink: boolean
  /** Message to show the user. Neutral in both allowlist branches (anti-enumeration). */
  message: string
}

/**
 * Pure decision: given the policy and whether the email is allowlisted, decide
 * whether to send a magic link and what to tell the user. When the allowlist is
 * active, BOTH branches return the same neutral message so the form never reveals
 * which emails are provisioned.
 */
export function resolveMagicLinkDecision(
  policy: Pick<AuthPolicy, 'magicLinkRequiresAllowlist'>,
  isAllowed: boolean,
): MagicLinkDecision {
  if (!policy.magicLinkRequiresAllowlist) {
    return { sendLink: true, message: defaultMagicLinkSentMessage }
  }
  return { sendLink: isAllowed, message: allowlistNeutralMessage }
}

export type AllowlistRpcResponse = {
  data: unknown
  error: { message: string } | null
}

/** Minimal shape of a Supabase client used to query the allowlist oracle. */
export type AllowlistRpcClient = {
  rpc(fn: 'is_email_allowed', args: { check_email: string }): PromiseLike<AllowlistRpcResponse>
}

/**
 * Ask the `is_email_allowed` SECURITY DEFINER RPC whether an email is on the
 * allowlist. The RPC returns only a boolean, never the list itself, so the
 * unauthenticated (anon) server client can call it safely.
 */
export async function isEmailAllowed(client: AllowlistRpcClient, email: string): Promise<boolean> {
  const { data, error } = await client.rpc('is_email_allowed', { check_email: normalizeEmail(email) })
  if (error) throw new Error(error.message)
  return data === true
}
