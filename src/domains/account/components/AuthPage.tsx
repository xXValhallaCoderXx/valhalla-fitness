import { Box } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
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
import { AuthFormPanel, type AuthMessage, type AuthMode } from './auth/AuthFormPanel'
import type { SentState } from './auth/AuthSentPanel'
import { AuthSidePanel } from './auth/AuthSidePanel'

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
  const emailValid = isValidEmail(email)

  const handleForgot = () => {
    if (!emailValid) {
      setEmailError(email.trim() ? 'Enter a valid email address.' : 'Email is required.')
      return
    }
    resetMutation.mutate()
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
      <AuthFormPanel
        email={email}
        password={password}
        mode={mode}
        message={message}
        emailError={emailError}
        sent={sent}
        passwordEnabled={passwordEnabled}
        passwordResetEnabled={policy?.passwordResetEnabled ?? false}
        emailValid={emailValid}
        passwordPending={passwordMutation.isPending}
        magicPending={magicMutation.isPending}
        resetPending={resetMutation.isPending}
        googlePending={googleMutation.isPending}
        onEmailChange={(nextEmail) => {
          setEmail(nextEmail)
          setEmailError(null)
        }}
        onPasswordChange={setPassword}
        onSubmit={() => {
          if (passwordEnabled) passwordMutation.mutate()
          else magicMutation.mutate()
        }}
        onMagicLink={() => magicMutation.mutate()}
        onPasswordReset={handleForgot}
        onGoogleSignIn={() => googleMutation.mutate()}
        onModeChange={(nextMode) => {
          setMode(nextMode)
          setMessage(null)
          setEmailError(null)
          setPassword('')
        }}
        onResend={handleResend}
        onBackToSignIn={handleBackToSignIn}
      />
    </Box>
  )
}
