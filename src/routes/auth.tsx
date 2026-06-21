import { useMutation } from '@tanstack/react-query'
import { Outlet, createFileRoute, useRouter, useRouterState } from '@tanstack/react-router'
import { Dumbbell, KeyRound, Link as LinkIcon, Mail } from 'lucide-react'
import { useState } from 'react'
import {
  resetPasswordFn,
  sendMagicLinkFn,
  signInWithPasswordFn,
  signUpWithPasswordFn,
} from '~/server/auth'
import { Button, Card, TextInput } from '~/components/ui'

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
  const [message, setMessage] = useState<string | null>(null)

  const passwordMutation = useMutation({
    mutationFn: () =>
      mode === 'login'
        ? signInWithPasswordFn({ data: { email, password } })
        : signUpWithPasswordFn({ data: { email, password } }),
    onSuccess: async (result) => {
      if (!result.ok) {
        setMessage(result.message)
        return
      }
      setMessage(mode === 'login' ? null : 'Account created. You are signed in.')
      await router.invalidate()
      await router.navigate({ to: '/today' })
    },
  })

  const magicMutation = useMutation({
    mutationFn: () => sendMagicLinkFn({ data: { email } }),
    onSuccess: (result) => {
      setMessage(result.ok ? 'Magic link sent. Check your email.' : result.message)
    },
  })

  const resetMutation = useMutation({
    mutationFn: () => resetPasswordFn({ data: { email } }),
    onSuccess: (result) => {
      setMessage(result.ok ? 'Password reset email sent.' : result.message)
    },
  })

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--action)] text-white">
            <Dumbbell size={24} />
          </div>
          <h1 className="text-2xl font-bold">Mobile Strength Tracker</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Sign in to continue to your training log.
          </p>
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
          <div className="grid grid-cols-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-1">
            <button
              type="button"
              className={`rounded-md px-3 py-2 text-sm font-bold ${
                authMethod === 'password' ? 'bg-[var(--action)] text-white' : 'text-[var(--muted)]'
              }`}
              onClick={() => setAuthMethod('password')}
            >
              Password
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-2 text-sm font-bold ${
                authMethod === 'magic' ? 'bg-[var(--action)] text-white' : 'text-[var(--muted)]'
              }`}
              onClick={() => setAuthMethod('magic')}
            >
              Magic link
            </button>
          </div>
          <label className="grid gap-1">
            <span className="text-xs font-bold uppercase text-[var(--muted)]">Email</span>
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
              <span className="text-xs font-bold uppercase text-[var(--muted)]">Password</span>
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
            className="w-full"
            disabled={
              authMethod === 'magic'
                ? !email || magicMutation.isPending
                : !email || !password || passwordMutation.isPending
            }
          >
            {authMethod === 'magic' ? <Mail size={16} /> : <KeyRound size={16} />}
            {authMethod === 'magic' ? 'Send magic link' : mode === 'login' ? 'Log in' : 'Create account'}
          </Button>
        </form>

        {authMethod === 'password' ? (
          <>
            <Button
              type="button"
              className="mt-3 w-full"
              variant="secondary"
              disabled={!email || resetMutation.isPending}
              onClick={() => resetMutation.mutate()}
            >
              <LinkIcon size={15} />
              Reset password
            </Button>
            <button
              type="button"
              className="mt-4 w-full text-center text-sm font-semibold text-[var(--action)]"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            >
              {mode === 'login' ? 'Create an account' : 'Already have an account? Log in'}
            </button>
          </>
        ) : null}

        {authMethod === 'magic' ? (
          <Button
            type="button"
            className="mt-3 w-full"
            variant="secondary"
            disabled={!email || resetMutation.isPending}
            onClick={() => resetMutation.mutate()}
          >
            <LinkIcon size={15} />
            Reset password
          </Button>
        ) : null}

        {message ? (
          <p className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm text-[var(--muted)]">
            {message}
          </p>
        ) : null}
      </Card>
    </main>
  )
}
