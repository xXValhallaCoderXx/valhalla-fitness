import { useMutation } from '@tanstack/react-query'
import { Button, Card, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { Outlet, createFileRoute, useRouter, useRouterState } from '@tanstack/react-router'
import { Dumbbell, KeyRound, Link as LinkIcon, Mail } from 'lucide-react'
import { useState } from 'react'
import {
  resetPasswordFn,
  sendMagicLinkFn,
  signInWithPasswordFn,
  signUpWithPasswordFn,
} from '~/domains/account/server/auth-functions'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { authUserQueryOptions, meQueryOptions } from '~/domains/account/queries'

export const Route = createFileRoute('/auth')({
  component: AuthRoute,
})

function AuthRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  if (pathname === '/auth/callback') return <Outlet />
  return <AuthForm />
}

function AuthForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMethod, setAuthMethod] = useState<'password' | 'magic'>('password')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState<{ tone: 'success' | 'danger' | 'neutral'; text: string } | null>(null)

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
      const queryClient = router.options.context.queryClient
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['auth'] }),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
      ])
      await queryClient.fetchQuery(authUserQueryOptions())
      await queryClient.fetchQuery(meQueryOptions()).catch(() => null)
      await router.invalidate()
      await router.navigate({ to: '/today' })
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
    <main className="grid min-h-screen bg-[var(--mantine-color-body)] text-[var(--mantine-color-text)] md:grid-cols-[minmax(18rem,0.9fr)_minmax(28rem,1.1fr)]">
      <section className="hidden border-r border-[var(--mantine-color-default-border)] bg-[var(--vf-bg-elevated)] p-8 md:flex md:flex-col md:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--vf-brand-mark)] text-[var(--vf-brand-mark-text)]">
            <Dumbbell size={16} />
          </span>
          <span className="text-sm font-extrabold">Sheetless</span>
        </div>
        <div className="max-w-sm">
          <p className="vf-section-label">Training cockpit</p>
          <h2 className="mt-2 text-3xl font-extrabold leading-tight">Planned work, fast logging, clear progression.</h2>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="vf-stat">
              <p className="vf-stat-value">5</p>
              <p className="vf-stat-label">Core routes</p>
            </div>
            <div className="vf-stat">
              <p className="vf-stat-value">RIR</p>
              <p className="vf-stat-label">Logged sets</p>
            </div>
            <div className="vf-stat">
              <p className="vf-stat-value">TM</p>
              <p className="vf-stat-label">Decisions</p>
            </div>
          </div>
        </div>
        <p className="text-xs font-semibold text-[var(--mantine-color-dimmed)]">Supabase account required for synced workouts.</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-3 py-6 md:px-8">
        <Card className="w-full max-w-[30rem] overflow-hidden p-0 shadow-[var(--vf-shadow-panel)]">
          <div className="flex items-center justify-between border-b border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-4 py-3 md:hidden">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--vf-brand-mark)] text-[var(--vf-brand-mark-text)]">
                <Dumbbell size={14} />
              </span>
              <span className="text-sm font-extrabold">Sheetless</span>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] text-[var(--mantine-color-dimmed)]" aria-hidden="true">
              <KeyRound size={14} />
            </span>
          </div>
          <div className="p-5 md:p-6">
            <div className="mb-5">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] text-[var(--vf-action-text)]">
                <Dumbbell size={22} />
              </div>
              <h1 className="text-[1.35rem] font-extrabold leading-tight">Welcome back</h1>
              <p className="mt-1 text-sm font-medium text-[var(--mantine-color-dimmed)]">Sign in to your Sheetless account.</p>
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
              <div className="grid grid-cols-2 rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-1">
                <button
                  type="button"
                  className="rounded-md px-3 py-2 text-sm font-extrabold text-[var(--mantine-color-dimmed)] transition data-[active=true]:bg-[var(--mantine-color-default)] data-[active=true]:text-[var(--vf-action-text)] data-[active=true]:shadow-[var(--vf-shadow-card)]"
                  data-active={authMethod === 'password'}
                  onClick={() => {
                    setAuthMethod('password')
                    setMessage(null)
                  }}
                >
                  Password
                </button>
                <button
                  type="button"
                  className="rounded-md px-3 py-2 text-sm font-extrabold text-[var(--mantine-color-dimmed)] transition data-[active=true]:bg-[var(--mantine-color-default)] data-[active=true]:text-[var(--vf-action-text)] data-[active=true]:shadow-[var(--vf-shadow-card)]"
                  data-active={authMethod === 'magic'}
                  onClick={() => {
                    setAuthMethod('magic')
                    setMessage(null)
                  }}
                >
                  Magic link
                </button>
              </div>
              <label className="grid gap-1">
                <span className="vf-section-label">Email</span>
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
                  <span className="vf-section-label">Password</span>
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
                className="w-full"
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
              className="mt-2 w-full"
              variant="default"
              disabled={!email || resetMutation.isPending}
              onClick={() => resetMutation.mutate()}
            >
              <LinkIcon size={15} />
              {resetMutation.isPending ? 'Sending reset...' : 'Reset password'}
            </Button>

            {authMethod === 'password' ? (
              <button
                type="button"
                className="mt-4 w-full rounded-md py-1.5 text-center text-sm font-bold text-[var(--vf-action-text)] transition hover:bg-[var(--vf-action-soft)]"
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login')
                  setMessage(null)
                }}
              >
                {mode === 'login' ? 'Create an account' : 'Already have an account? Log in'}
              </button>
            ) : null}

            {message ? (
              <p
                className={`mt-4 rounded-lg border p-3 text-sm font-semibold ${
                  message.tone === 'danger'
                    ? 'border-[var(--vf-danger-border)] bg-[var(--vf-danger-soft)] text-[var(--vf-danger-text)]'
                    : message.tone === 'success'
                      ? 'border-[var(--vf-success-border)] bg-[var(--vf-success-soft)] text-[var(--vf-success-text)]'
                      : 'border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] text-[var(--mantine-color-dimmed)]'
                }`}
                role={message.tone === 'danger' ? 'alert' : 'status'}
              >
                {message.text}
              </p>
            ) : null}
          </div>
        </Card>
      </section>
    </main>
  )
}
