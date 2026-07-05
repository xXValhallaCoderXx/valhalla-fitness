import { Alert, Box, Button, Card, Divider, PasswordInput, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, ArrowRight, Check, Mail } from 'lucide-react'
import { useState } from 'react'
import { BrandMark, Caption, Heading, SectionLabel, Text } from '~/components'
import { sendBrowserMagicLink, startBrowserGoogleSignIn } from '~/domains/account/lib/oauth-browser'
import { isValidEmail } from '~/domains/account/lib/password-strength'
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
import { GoogleGIcon, PasswordStrengthMeter } from './auth/AuthFormControls'
import { AuthSentPanel, type SentKind, type SentState } from './auth/AuthSentPanel'
import { AuthSidePanel } from './auth/AuthSidePanel'

type AuthMode = 'login' | 'signup'
type AuthMessage = { tone: 'success' | 'danger' | 'neutral'; text: string }

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
      <AuthSidePanel />

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
