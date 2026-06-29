import { betaMagicLinkMessage } from '~/shared/lib/auth-config'

const BETA_MAGIC_LINK_EMAIL = 'renate.gouveia@gmail.com'

type MagicLinkAuthClient = {
  signInWithOtp(input: {
    email: string
    options: {
      emailRedirectTo: string
    }
  }): Promise<{
    error: {
      message: string
    } | null
  }>
}

type SendBetaMagicLinkOptions = {
  auth: MagicLinkAuthClient
  email: string
  origin: string
}

export function normalizeBetaAccessEmail(email: string) {
  return email.trim().toLowerCase()
}

export function getBetaMagicLinkAccess(email: string) {
  const normalizedEmail = normalizeBetaAccessEmail(email)

  return {
    normalizedEmail,
    shouldSendMagicLink: normalizedEmail === BETA_MAGIC_LINK_EMAIL,
  }
}

export async function sendBetaMagicLink({ auth, email, origin }: SendBetaMagicLinkOptions) {
  const access = getBetaMagicLinkAccess(email)

  if (!access.shouldSendMagicLink) {
    return { ok: true, message: betaMagicLinkMessage } as const
  }

  const { error } = await auth.signInWithOtp({
    email: access.normalizedEmail,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  return error ? ({ ok: false, message: error.message } as const) : ({ ok: true, message: betaMagicLinkMessage } as const)
}
