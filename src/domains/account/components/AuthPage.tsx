import { Alert, Box, Button, Card, Divider, PasswordInput, SegmentedControl, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowRight, CheckCircle2, Dumbbell, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { BrandLockup, Caption, Heading, Panel, SectionLabel, Text } from '~/components'
import { useCompleteAuthRedirect } from '~/domains/account/lib/useCompleteAuthRedirect'
import { authPolicyQueryOptions } from '~/domains/account/queries'
import {
  type MagicLinkResult,
  type OAuthStartResult,
  resetPasswordFn,
  sendMagicLinkFn,
  signInWithPasswordFn,
  signUpWithPasswordFn,
  startGoogleSignInFn,
} from '~/domains/account/server/auth-functions'
import { getApiErrorMessage } from '~/shared/lib/api-error'

type AuthMethod = 'password' | 'magic'
type AuthMode = 'login' | 'signup'
type AuthMessage = { tone: 'success' | 'danger' | 'neutral'; text: string }

const authMethodOptions = [
  { value: 'password', label: 'Password' },
  { value: 'magic', label: 'Magic link' },
]

const sidePanelChips = ['Est. 1RM 108 kg', 'Fatigue Fresh']
const sidePanelReceipt = [
  'Last time you hit 87.5 × 5 at RIR 1–2.',
  'So Sheetless added 2.5 kg today.',
]

async function sendBrowserMagicLink(result: Extract<MagicLinkResult, { browserRequest: object }>) {
  const { createBrowserClient } = await import('@supabase/ssr')
  const { browserRequest } = result
  const supabase = createBrowserClient(browserRequest.supabaseUrl, browserRequest.supabaseAnonKey)
  const { error } = await supabase.auth.signInWithOtp({
    email: browserRequest.email,
    options: {
      emailRedirectTo: browserRequest.emailRedirectTo,
      shouldCreateUser: browserRequest.shouldCreateUser,
    },
  })

  if (error) {
    return { ok: false, message: error.message } as const
  }

  return { ok: true, message: result.message } as const
}

async function startBrowserGoogleSignIn(result: Extract<OAuthStartResult, { ok: true }>) {
  const { createBrowserClient } = await import('@supabase/ssr')
  const { browserRequest } = result
  const supabase = createBrowserClient(browserRequest.supabaseUrl, browserRequest.supabaseAnonKey)
  const { error } = await supabase.auth.signInWithOAuth({
    provider: browserRequest.provider,
    options: { redirectTo: browserRequest.redirectTo },
  })
  // On success supabase-js redirects the browser to Google; only errors return here.
  return error ? ({ ok: false, message: error.message } as const) : ({ ok: true } as const)
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

export function AuthPage() {
  const completeAuthRedirect = useCompleteAuthRedirect()
  const { data: policy } = useQuery(authPolicyQueryOptions())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMethod, setAuthMethod] = useState<AuthMethod>('password')
  const [mode, setMode] = useState<AuthMode>('login')
  const [message, setMessage] = useState<AuthMessage | null>(null)

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
        const text = 'Account created. Check your email to confirm your account.'
        setMessage({ tone: 'success', text })
        notifications.show({ color: 'success', title: 'Account created', message: text })
        return
      }
      notifications.show({
        color: 'success',
        title: mode === 'login' ? 'Logged in' : 'Account created',
        message: mode === 'login' ? 'Welcome back.' : 'Your account is ready.',
      })
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
      const text = browserResult.message
      if (!browserResult.ok) {
        setMessage({ tone: 'danger', text })
        return
      }
      // With the allowlist active the confirmation is neutral and identical whether or
      // not the email is provisioned, so the form never reveals the access list.
      const neutral = policy?.magicLinkRequiresAllowlist ?? false
      const tone: AuthMessage['tone'] = neutral ? 'neutral' : 'success'
      setMessage({ tone, text })
      notifications.show({
        color: tone,
        title: neutral ? 'Check your email' : 'Magic link sent',
        message: text,
      })
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
      const text = result.ok ? 'Password reset email sent.' : result.message
      setMessage({ tone: result.ok ? 'success' : 'danger', text })
      if (result.ok) notifications.show({ color: 'success', title: 'Password reset sent', message: text })
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
  const isMagic = !passwordEnabled || authMethod === 'magic'
  const showMethodToggle = passwordEnabled
  const showReset = (policy?.passwordResetEnabled ?? false) && !isMagic && !isSignup

  const titleCopy = !passwordEnabled ? 'Sign in to Sheetless' : isSignup ? 'Create your account' : 'Welcome back'
  const subtitleCopy = !passwordEnabled
    ? 'We’ll email you a one-tap sign-in link — no password needed.'
    : isSignup
      ? 'Start training with Sheetless — it’s free.'
      : 'Sign in to your Sheetless account.'
  const switchPrompt = isSignup ? 'Already have an account?' : 'New to Sheetless?'
  const switchAction = isSignup ? 'Sign in instead' : 'Create an account'

  const submitLabel = isMagic
    ? magicMutation.isPending
      ? 'Sending link...'
      : 'Send magic link'
    : passwordMutation.isPending
      ? isSignup
        ? 'Creating account...'
        : 'Logging in...'
      : isSignup
        ? 'Create account'
        : 'Log in'

  const handleForgot = () => {
    if (!email) {
      setMessage({ tone: 'neutral', text: 'Enter your email above, then tap reset.' })
      return
    }
    resetMutation.mutate()
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
          <BrandLockup size="md" />
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
          <Lock color="var(--mantine-color-dimmed)" size={15} />
          <Caption fw={600}>Supabase account required for synced workouts.</Caption>
        </div>
      </Box>

      {/* Right auth panel */}
      <Box component="section" className="flex min-h-screen items-center justify-center px-4 py-8 md:px-8">
        <div className="w-full max-w-[26rem]">
          <Card className="overflow-hidden p-0" shadow="xl" radius="lg">
            <Box
              className="flex items-center justify-between px-5 py-3 md:hidden"
              style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
            >
              <BrandLockup />
            </Box>

            <div className="p-6 md:p-8">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: 'var(--vf-action-soft)',
                  border: '1px solid var(--vf-action-border)',
                }}
              >
                <Dumbbell color="var(--vf-action-text)" size={22} />
              </div>

              <Heading order={1} size="1.5rem" mt="md" lh={1.1}>
                {titleCopy}
              </Heading>
              <Text component="p" size="sm" tone="dimmed" fw={600} mt={6}>
                {subtitleCopy}
              </Text>

              <Button
                className="mt-6"
                type="button"
                fullWidth
                size="md"
                variant="default"
                leftSection={<GoogleGIcon />}
                onClick={() => googleMutation.mutate()}
                disabled={googleMutation.isPending}
              >
                {googleMutation.isPending ? 'Redirecting…' : 'Continue with Google'}
              </Button>
              <Divider my="md" label="or" labelPosition="center" />

              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (isMagic) {
                    magicMutation.mutate()
                  } else {
                    passwordMutation.mutate()
                  }
                }}
              >
                {showMethodToggle ? (
                  <SegmentedControl
                    fullWidth
                    value={authMethod}
                    data={authMethodOptions}
                    onChange={(value) => {
                      setAuthMethod(value as AuthMethod)
                      setMessage(null)
                    }}
                  />
                ) : null}

                <label className="grid gap-1.5">
                  <SectionLabel>Email</SectionLabel>
                  <TextInput
                    type="email"
                    aria-label="Email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    required
                  />
                </label>

                {!isMagic ? (
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
                      placeholder="••••••••"
                      required
                    />
                  </div>
                ) : null}

                {isMagic ? (
                  <div
                    className="flex items-start gap-2.5 rounded-[var(--mantine-radius-md)] p-3"
                    style={{
                      backgroundColor: 'var(--vf-action-soft)',
                      border: '1px solid var(--vf-action-border)',
                    }}
                  >
                    <Mail color="var(--vf-action-text)" size={16} className="mt-0.5 shrink-0" />
                    <Text component="p" size="sm" tone="dimmed" fw={600}>
                      We’ll email you a one-tap sign-in link — no password needed.
                    </Text>
                  </div>
                ) : null}

                <Button
                  type="submit"
                  fullWidth
                  size="md"
                  disabled={isMagic ? !email || magicMutation.isPending : !email || !password || passwordMutation.isPending}
                >
                  {submitLabel}
                  <ArrowRight color="currentColor" size={17} />
                </Button>
              </form>

              {showMethodToggle ? (
                <>
                  <Divider my="lg" label={switchPrompt} labelPosition="center" />

                  <Button
                    type="button"
                    fullWidth
                    variant="default"
                    onClick={() => {
                      setMode(isSignup ? 'login' : 'signup')
                      setMessage(null)
                    }}
                  >
                    {switchAction}
                  </Button>
                </>
              ) : null}

              {message ? (
                <Alert
                  mt="md"
                  color={message.tone === 'neutral' ? 'neutral' : message.tone}
                  role={message.tone === 'danger' ? 'alert' : 'status'}
                >
                  {message.text}
                </Alert>
              ) : null}
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
