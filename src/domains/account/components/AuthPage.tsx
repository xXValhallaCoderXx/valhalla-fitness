import { Alert, Box, Button, Card, Divider, PasswordInput, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, Mail } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { BrandLockup, BrandMark, Caption, Heading, Panel, SectionLabel, Text, toneColor } from '~/components'
import { sendBrowserMagicLink, startBrowserGoogleSignIn } from '~/domains/account/lib/oauth-browser'
import { isValidEmail, scorePasswordStrength } from '~/domains/account/lib/password-strength'
import { useCompleteAuthRedirect } from '~/domains/account/lib/useCompleteAuthRedirect'
import { authPolicyQueryOptions } from '~/domains/account/queries'
import {
  resetPasswordFn,
  sendMagicLinkFn,
  signInWithPasswordFn,
  signUpWithPasswordFn,
  startGoogleSignInFn,
} from '~/domains/account/server/auth-functions'
import { getApiErrorMessage } from '~/shared/lib/api-error'

type AuthMode = 'login' | 'signup'
type AuthMessage = { tone: 'success' | 'danger' | 'neutral'; text: string }
type SentKind = 'magic' | 'reset' | 'signup'
/** When an email is dispatched we swap the form for a confirmation view. `message` carries the
 * server's neutral copy for the allowlist case, where we must not assert that a link was sent. */
type SentState = { kind: SentKind; email: string; message?: string }

const sidePanelChips = ['Est. 1RM 108 kg', 'Fatigue Fresh']
const sidePanelReceipt = [
  'Last time you hit 87.5 × 5 at RIR 1–2.',
  'So Sheetless added 2.5 kg today.',
]

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

function GoogleGIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.29a12 12 0 0 0 0 10.74l3.98-3.09Z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44A11.99 11.99 0 0 0 12 0 12 12 0 0 0 1.29 6.63l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  )
}

/** Sign-up only: a themed bar + label derived from the pure `scorePasswordStrength` scorer. */
function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = scorePasswordStrength(password)
  const color = toneColor(strength.tone)
  return (
    <div className="mt-2 flex items-center gap-3">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full"
        style={{ backgroundColor: 'var(--mantine-color-default-border)' }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${strength.widthPct}%`, backgroundColor: color, transition: 'width 160ms ease' }}
        />
      </div>
      <Text component="span" size="xs" fw={700} ta="right" tone={strength.tone} style={{ width: '4.5rem' }}>
        {strength.label}
      </Text>
    </div>
  )
}

/** Post-send confirmation shown in place of the form for magic-link / reset / sign-up emails. */
function AuthSentPanel({
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

export function AuthPage() {
  const completeAuthRedirect = useCompleteAuthRedirect()
  const { data: policy } = useQuery(authPolicyQueryOptions())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<AuthMode>('login')
  const [message, setMessage] = useState<AuthMessage | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [sent, setSent] = useState<SentState | null>(null)

  const passwordMutation = useMutation({
    mutationFn: () =>
      mode === 'login'
        ? signInWithPasswordFn({ data: { email, password } })
        : signUpWithPasswordFn({ data: { email, password } }),
    onMutate: () => {
      setMessage(null)
    },
    onSuccess: async (result) => {
      if (!result.ok) {
        setMessage({ tone: 'danger', text: result.message })
        return
      }
      if (mode === 'signup' && 'needsEmailConfirmation' in result && result.needsEmailConfirmation) {
        // The AuthSentPanel already tells the user to confirm their email — no toast on top.
        setSent({ kind: 'signup', email })
        return
      }
      if (mode === 'login') {
        notifications.show({ color: 'success', title: 'Logged in', message: 'Welcome back.' })
      }
      await completeAuthRedirect()
    },
    onError: (error) => {
      setMessage({ tone: 'danger', text: getApiErrorMessage(error, 'Unable to sign in') })
    },
  })

  const magicMutation = useMutation({
    mutationFn: () => sendMagicLinkFn({ data: { email } }),
    onMutate: () => {
      setMessage(null)
    },
    onSuccess: async (result) => {
      const browserResult = result.ok && result.browserRequest ? await sendBrowserMagicLink(result) : result
      if (!browserResult.ok) {
        setMessage({ tone: 'danger', text: browserResult.message })
        return
      }
      // With the allowlist active the confirmation must be identical whether or not the email is
      // provisioned, so we surface the server's neutral copy verbatim and never assert a delivery.
      const neutral = policy?.magicLinkRequiresAllowlist ?? false
      notifications.show({
        color: neutral ? 'neutral' : 'success',
        title: neutral ? 'Check your email' : 'Magic link sent',
        message: browserResult.message,
      })
      setSent({ kind: 'magic', email, message: neutral ? browserResult.message : undefined })
    },
    onError: (error) => {
      setMessage({ tone: 'danger', text: getApiErrorMessage(error, 'Unable to send magic link') })
    },
  })

  const resetMutation = useMutation({
    mutationFn: () => resetPasswordFn({ data: { email } }),
    onMutate: () => {
      setMessage(null)
    },
    onSuccess: (result) => {
      if (!result.ok) {
        setMessage({ tone: 'danger', text: result.message })
        return
      }
      notifications.show({ color: 'success', title: 'Password reset sent', message: 'Password reset email sent.' })
      setSent({ kind: 'reset', email })
    },
    onError: (error) => {
      setMessage({ tone: 'danger', text: getApiErrorMessage(error, 'Unable to send password reset') })
    },
  })

  const googleMutation = useMutation({
    mutationFn: () => startGoogleSignInFn(),
    onMutate: () => {
      setMessage(null)
    },
    onSuccess: async (result) => {
      if (!result.ok) {
        setMessage({ tone: 'danger', text: result.message })
        return
      }
      const browserResult = await startBrowserGoogleSignIn(result)
      // Success redirects the browser to Google; only a failure surfaces here.
      if (!browserResult.ok) setMessage({ tone: 'danger', text: browserResult.message })
    },
    onError: (error) => {
      setMessage({ tone: 'danger', text: getApiErrorMessage(error, 'Unable to start Google sign-in') })
    },
  })

  const passwordEnabled = policy?.passwordSignInEnabled ?? false
  const isSignup = passwordEnabled && mode === 'signup'
  const showReset = (policy?.passwordResetEnabled ?? false) && !isSignup
  // Magic link is offered as a passwordless secondary option on both the login and signup forms.
  const showMagicSecondary = passwordEnabled
  const emailValid = isValidEmail(email)

  const titleCopy = !passwordEnabled ? 'Sign in to Sheetless' : isSignup ? 'Create your account' : 'Welcome back'
  const subtitleCopy = !passwordEnabled
    ? 'We’ll email you a one-tap sign-in link — no password needed.'
    : isSignup
      ? 'Start training with Sheetless — it’s free.'
      : 'Sign in to your Sheetless account.'
  const switchPrompt = isSignup ? 'Already have an account?' : 'New to Sheetless?'
  const switchAction = isSignup ? 'Sign in instead' : 'Create an account'

  // Password is the primary path when enabled (local/dev); in production the form collapses to
  // magic-link only, so the primary submit sends the link. Labels stay stable — the Button's
  // `loading` prop supplies the spinner.
  const submitLabel = !passwordEnabled ? 'Send magic link' : isSignup ? 'Create account' : 'Log in'
  const submitPending = passwordEnabled ? passwordMutation.isPending : magicMutation.isPending

  const handleForgot = () => {
    if (!emailValid) {
      setEmailError(email.trim() ? 'Enter a valid email address.' : 'Email is required.')
      return
    }
    resetMutation.mutate()
  }

  const resendPendingByKind: Record<SentKind, boolean> = {
    magic: magicMutation.isPending,
    reset: resetMutation.isPending,
    signup: passwordMutation.isPending,
  }

  const handleResend = () => {
    if (!sent) return
    if (sent.kind === 'magic') magicMutation.mutate()
    else if (sent.kind === 'reset') resetMutation.mutate()
    else passwordMutation.mutate()
  }

  const handleBackToSignIn = () => {
    setSent(null)
    setMessage(null)
    setEmailError(null)
    setMode('login')
    setPassword('')
  }

  return (
    <Box
      component="main"
      bg="var(--mantine-color-body)"
      c="var(--mantine-color-text)"
      className="grid min-h-screen md:grid-cols-[minmax(20rem,0.9fr)_minmax(26rem,1.1fr)]"
    >
      {/* Left cockpit panel */}
      <Box
        component="section"
        bg="var(--vf-bg-elevated)"
        className="relative hidden overflow-hidden p-8 md:flex md:flex-col md:justify-between lg:p-12"
        style={{ borderRight: '1px solid var(--mantine-color-default-border)' }}
      >
        <div className="vf-radial-glow absolute inset-0" style={{ ['--vf-glow-x' as string]: '12%' }} aria-hidden />
        <div className="vf-dot-grid absolute inset-0" aria-hidden />

        <div className="relative">
          <Link to="/" aria-label="Sheetless home" className="inline-flex w-fit">
            <BrandLockup size="md" />
          </Link>
        </div>

        <div className="relative max-w-md py-8">
          <SectionLabel>Training cockpit</SectionLabel>
          <Heading order={2} size="2.25rem" lh={1.07} mt="xs">
            Planned work, fast logging, clear progression.
          </Heading>
          <Text component="p" size="lg" tone="dimmed" fw={600} mt="md" maw="27rem">
            Sign in and pick up exactly where you left off — your plan, your loads, and your next decision
            are already waiting.
          </Text>

          <div className="vf-floaty mt-8 max-w-sm">
            <Panel p={0} className="overflow-hidden">
              <div
                className="flex items-center justify-between gap-3 px-4 py-3"
                style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
              >
                <Heading order={3} size="0.95rem" lh={1.2}>
                  Squat · Week 4
                </Heading>
                <span
                  className="rounded-full px-2.5 py-1"
                  style={{
                    backgroundColor: 'var(--vf-success-soft)',
                    border: '1px solid var(--vf-success-border)',
                  }}
                >
                  <Caption fw={800} tt="uppercase" tone="success">
                    On track
                  </Caption>
                </span>
              </div>
              <div className="p-4">
                <SectionLabel>Next session</SectionLabel>
                <Heading order={3} size="1.6rem" lh={1.1} mt={3}>
                  90 kg{' '}
                  <Text component="span" inherit tone="dimmed">
                    × 5
                  </Text>
                </Heading>
                <div className="mt-3 grid gap-2">
                  {sidePanelReceipt.map((line) => (
                    <div key={line} className="flex gap-2.5">
                      <CheckCircle2 color="var(--vf-success-text)" size={16} className="mt-0.5 shrink-0" />
                      <Text component="p" size="sm" tone="dimmed" fw={600}>
                        {line}
                      </Text>
                    </div>
                  ))}
                </div>
                <div
                  className="mt-3 flex flex-wrap gap-2 pt-3"
                  style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
                >
                  {sidePanelChips.map((chip) => (
                    <span key={chip} className="vf-chip">
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </Panel>
          </div>
        </div>

        <div className="relative flex items-center gap-2">

        </div>
      </Box>

      {/* Right auth panel */}
      <Box component="section" className="flex min-h-screen items-center justify-center px-4 py-8 md:px-8">
        <div className="w-full max-w-[26rem]">
          <Card className="overflow-hidden" shadow="xl" radius="lg" p={0}>
            <div className="p-6 md:p-8">
              <Link to="/" aria-label="Sheetless home" className="inline-flex w-fit">
                <BrandMark size="lg" />
              </Link>

              {sent ? (
                <AuthSentPanel
                  sent={sent}
                  resending={resendPendingByKind[sent.kind]}
                  errorText={message?.tone === 'danger' ? message.text : null}
                  onResend={handleResend}
                  onBack={handleBackToSignIn}
                />
              ) : (
                <>
                  <Heading order={1} size="1.5rem" lh={1.1} mt="lg">
                    {titleCopy}
                  </Heading>
                  <Text component="p" size="sm" tone="dimmed" fw={600} mt={6}>
                    {subtitleCopy}
                  </Text>

                    {message ? (
                      <Alert
                        mt="md"
                        color={message.tone === 'neutral' ? 'neutral' : message.tone}
                        role={message.tone === 'danger' ? 'alert' : 'status'}
                        icon={message.tone === 'danger' ? <AlertTriangle size={16} /> : undefined}
                      >
                        {message.text}
                      </Alert>
                    ) : null}

                    <Button
                      className="mt-6"
                      type="button"
                      fullWidth
                      size="md"
                      variant="default"
                      leftSection={<GoogleGIcon />}
                      onClick={() => googleMutation.mutate()}
                      loading={googleMutation.isPending}
                      disabled={googleMutation.isPending}
                    >
                      Continue with Google
                    </Button>
                    <Divider my="md" label="or" labelPosition="center" />

                    <form
                      className="space-y-4"
                      onSubmit={(event) => {
                        event.preventDefault()
                        if (passwordEnabled) {
                          passwordMutation.mutate()
                        } else {
                          magicMutation.mutate()
                        }
                      }}
                    >
                      <label className="grid gap-1.5">
                        <SectionLabel>Email</SectionLabel>
                        <TextInput
                          type="email"
                          aria-label="Email"
                          autoComplete="email"
                          value={email}
                          onChange={(event) => {
                            setEmail(event.target.value)
                            setEmailError(null)
                          }}
                          placeholder="name@example.com"
                          required
                          error={emailError}
                          rightSection={emailValid ? <Check color="var(--vf-success-text)" size={18} /> : undefined}
                          rightSectionPointerEvents="none"
                        />
                      </label>

                      {passwordEnabled ? (
                        <div className="grid gap-1.5">
                          <div className="flex items-center justify-between">
                            <SectionLabel>Password</SectionLabel>
                            {showReset ? (
                              <Button
                                type="button"
                                variant="subtle"
                                size="compact-xs"
                                onClick={handleForgot}
                                disabled={resetMutation.isPending}
                              >
                                {resetMutation.isPending ? 'Sending…' : 'Forgot?'}
                              </Button>
                            ) : null}
                          </div>
                          <PasswordInput
                            aria-label="Password"
                            autoComplete={isSignup ? 'new-password' : 'current-password'}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder={isSignup ? 'At least 6 characters' : '••••••••'}
                            required
                          />
                          {isSignup ? <PasswordStrengthMeter password={password} /> : null}
                        </div>
                      ) : null}

                      <Button
                        type="submit"
                        fullWidth
                        size="md"
                        loading={submitPending}
                        disabled={
                          passwordEnabled
                            ? !emailValid || !password || passwordMutation.isPending
                            : !emailValid || magicMutation.isPending
                        }
                      >
                        {submitLabel}
                        <ArrowRight color="currentColor" size={17} />
                      </Button>
                    </form>

                    {/* Passwordless alternative — same form, no toggle: send a one-time sign-in link. */}
                    {showMagicSecondary ? (
                      <Button
                        className="mt-4"
                        type="button"
                        fullWidth
                        size="md"
                        variant="default"
                        leftSection={<Mail color="var(--vf-action-text)" size={17} />}
                        onClick={() => magicMutation.mutate()}
                        loading={magicMutation.isPending}
                        disabled={!emailValid || magicMutation.isPending}
                      >
                        Email me a one-time link
                      </Button>
                    ) : null}

                    {passwordEnabled ? (
                      <>
                        <Divider my="lg" label={switchPrompt} labelPosition="center" />

                        <Button
                          type="button"
                          fullWidth
                          variant="default"
                          onClick={() => {
                            setMode(isSignup ? 'login' : 'signup')
                            setMessage(null)
                            setEmailError(null)
                            setPassword('')
                          }}
                        >
                          {switchAction}
                        </Button>
                      </>
                    ) : null}
                </>
              )}
            </div>
          </Card>

          <div className="mt-4 flex justify-center">
            <Caption component="p" ta="center" fw={600} maw="20rem">
              By continuing you agree to the Terms and acknowledge the Privacy Policy.
            </Caption>
          </div>
        </div>
      </Box>
    </Box>
  )
}
