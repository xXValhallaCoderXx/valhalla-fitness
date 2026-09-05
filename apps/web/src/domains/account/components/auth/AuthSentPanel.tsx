import { Alert, Button } from '@mantine/core'
import { AlertTriangle, ArrowLeft, Mail } from 'lucide-react'
import type { ReactNode } from 'react'
import { Caption, Heading, Text } from '~/components'

export type SentKind = 'magic' | 'reset' | 'signup'
/** When an email is dispatched we swap the form for a confirmation view. `message` carries the
 * server's neutral copy for the allowlist case, where we must not assert that a link was sent. */
export type SentState = { kind: SentKind; email: string; message?: string }

const sentCopy: Record<SentKind, { title: string; body: (email: ReactNode) => ReactNode }> = {
  magic: {
    title: 'Check your inbox',
    body: (email) => <>We sent a one-time sign-in link to {email}.</>,
  },
  reset: {
    title: 'Reset link sent',
    body: (email) => <>We sent a password-reset link to {email}. Follow it to choose a new password.</>,
  },
  signup: {
    title: 'Confirm your email',
    body: (email) => <>We sent a confirmation link to {email}. Confirm it to finish setting up your account.</>,
  },
}

/** Post-send confirmation shown in place of the form for magic-link / reset / sign-up emails. */
export function AuthSentPanel({
  sent,
  resending,
  errorText,
  onResend,
  onBack,
}: {
  sent: SentState
  resending: boolean
  errorText: string | null
  onResend: () => void
  onBack: () => void
}) {
  const copy = sentCopy[sent.kind]
  return (
    <div className="mt-6">
      <span
        className="inline-flex h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: 'var(--vf-success-soft)' }}
      >
        <Mail color="var(--vf-success-text)" size={28} />
      </span>
      <Heading order={1} size="1.5rem" lh={1.15} mt="md">
        {copy.title}
      </Heading>
      <Text component="p" size="sm" tone="dimmed" fw={600} mt={8} lh={1.55}>
        {sent.message ?? (
          <>
            {copy.body(
              <Text component="span" inherit fw={700} tone="default">
                {sent.email}
              </Text>,
            )}
          </>
        )}
      </Text>

      <Caption component="p" mt="md">
        Didn’t get it? Check your spam folder, or resend below.
      </Caption>

      {errorText ? (
        <Alert mt="md" color="danger" role="alert" icon={<AlertTriangle size={16} />}>
          {errorText}
        </Alert>
      ) : null}

      <Button className="mt-5" type="button" fullWidth size="md" variant="subtle" onClick={onResend} loading={resending}>
        Resend email
      </Button>
      <Button
        className="mt-2"
        type="button"
        fullWidth
        size="md"
        variant="default"
        leftSection={<ArrowLeft color="currentColor" size={17} />}
        onClick={onBack}
      >
        Back to sign in
      </Button>
    </div>
  )
}
