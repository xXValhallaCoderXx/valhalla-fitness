import { Alert, Box, Button, Card, SegmentedControl, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation } from '@tanstack/react-query'
import { KeyRound, Link as LinkIcon, Mail } from 'lucide-react'
import { useState } from 'react'
import { BrandLockup, BrandMark, Caption, Heading, Panel, SectionLabel, StatValue, Text } from '~/components'
import { useCompleteAuthRedirect } from '~/domains/account/lib/useCompleteAuthRedirect'
import {
  resetPasswordFn,
  sendMagicLinkFn,
  signInWithPasswordFn,
  signUpWithPasswordFn,
} from '~/domains/account/server/auth-functions'
import { getApiErrorMessage } from '~/shared/lib/api-error'

type AuthMethod = 'password' | 'magic'
type AuthMode = 'login' | 'signup'
type AuthMessage = { tone: 'success' | 'danger' | 'neutral'; text: string }

const authMethodOptions = [
  { value: 'password', label: 'Password' },
  { value: 'magic', label: 'Magic link' },
]

export function AuthPage() {
  const completeAuthRedirect = useCompleteAuthRedirect()
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
    onSuccess: (result) => {
      const text = result.ok ? 'Magic link sent. Check your email.' : result.message
      setMessage({ tone: result.ok ? 'success' : 'danger', text })
      if (result.ok) notifications.show({ color: 'success', title: 'Magic link sent', message: text })
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

  const submitLabel =
    authMethod === 'magic'
      ? magicMutation.isPending
        ? 'Sending link...'
        : 'Send magic link'
      : passwordMutation.isPending
        ? mode === 'login'
          ? 'Logging in...'
          : 'Creating account...'
        : mode === 'login'
          ? 'Log in'
          : 'Create account'

  return (
    <Box
      component="main"
      bg="var(--mantine-color-body)"
      c="var(--mantine-color-text)"
      className="grid min-h-screen md:grid-cols-[minmax(18rem,0.9fr)_minmax(28rem,1.1fr)]"
    >
      <Box
        component="section"
        bg="var(--vf-bg-elevated)"
        className="hidden p-8 md:flex md:flex-col md:justify-between"
        style={{ borderRight: '1px solid var(--mantine-color-default-border)' }}
      >
        <BrandLockup size="md" />
        <div className="max-w-sm">
          <SectionLabel>Training cockpit</SectionLabel>
          <Heading order={2} size="h2" mt="xs" lh={1.1}>
            Planned work, fast logging, clear progression.
          </Heading>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <AuthMetric value="5" label="Core routes" />
            <AuthMetric value="RIR" label="Logged sets" />
            <AuthMetric value="TM" label="Decisions" />
          </div>
        </div>
        <Caption fw={700}>Supabase account required for synced workouts.</Caption>
      </Box>

      <Box component="section" className="flex min-h-screen items-center justify-center px-3 py-6 md:px-8">
        <Card className="w-full max-w-[30rem] overflow-hidden p-0" shadow="xl">
          <Box
            className="flex items-center justify-between px-4 py-3 md:hidden"
            style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
          >
            <BrandLockup />
            <BrandMark size="md" muted withBorder>
              <KeyRound size={14} />
            </BrandMark>
          </Box>
          <div className="p-5 md:p-6">
            <div className="mb-5">
              <BrandMark size="lg" muted withBorder />
              <Heading order={1} size="1.35rem" mt="sm" lh={1.1}>
                Welcome back
              </Heading>
              <Text component="p" size="sm" tone="dimmed" fw={600} mt={4}>
                Sign in to your Sheetless account.
              </Text>
            </div>

            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                if (authMethod === 'magic') {
                  magicMutation.mutate()
                } else {
                  passwordMutation.mutate()
                }
              }}
            >
              <SegmentedControl
                fullWidth
                value={authMethod}
                data={authMethodOptions}
                onChange={(value) => {
                  setAuthMethod(value as AuthMethod)
                  setMessage(null)
                }}
              />
              <label className="grid gap-1">
                <SectionLabel>Email</SectionLabel>
                <TextInput
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </label>
              {authMethod === 'password' ? (
                <label className="grid gap-1">
                  <SectionLabel>Password</SectionLabel>
                  <TextInput
                    type="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                    required
                  />
                </label>
              ) : null}
              <Button
                type="submit"
                fullWidth
                disabled={
                  authMethod === 'magic'
                    ? !email || magicMutation.isPending
                    : !email || !password || passwordMutation.isPending
                }
              >
                {authMethod === 'magic' ? <Mail size={16} /> : <KeyRound size={16} />}
                {submitLabel}
              </Button>
            </form>

            <Button
              type="button"
              fullWidth
              mt="xs"
              variant="default"
              disabled={!email || resetMutation.isPending}
              onClick={() => resetMutation.mutate()}
            >
              <LinkIcon size={15} />
              {resetMutation.isPending ? 'Sending reset...' : 'Reset password'}
            </Button>

            {authMethod === 'password' ? (
              <Button
                type="button"
                fullWidth
                mt="md"
                variant="subtle"
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login')
                  setMessage(null)
                }}
              >
                {mode === 'login' ? 'Create an account' : 'Already have an account? Log in'}
              </Button>
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
      </Box>
    </Box>
  )
}

function AuthMetric({ label, value }: { label: string; value: string }) {
  return (
    <Panel surface="inset" p="sm" className="min-w-0">
      <StatValue ta="center" size="1.15rem" truncate>
        {value}
      </StatValue>
      <Caption component="p" ta="center" fw={800} tt="uppercase" mt={4}>
        {label}
      </Caption>
    </Panel>
  )
}
