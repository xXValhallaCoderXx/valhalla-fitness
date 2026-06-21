import { useMutation } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
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
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
            passwordMutation.mutate()
          }}
        >
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
          <Button className="w-full" disabled={passwordMutation.isPending}>
            <KeyRound size={16} />
            {mode === 'login' ? 'Log in' : 'Create account'}
          </Button>
        </form>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            disabled={!email || magicMutation.isPending}
            onClick={() => magicMutation.mutate()}
          >
            <Mail size={15} />
            Magic link
          </Button>
          <Button
            variant="secondary"
            disabled={!email || resetMutation.isPending}
            onClick={() => resetMutation.mutate()}
          >
            <LinkIcon size={15} />
            Reset
          </Button>
        </div>

        <button
          type="button"
          className="mt-4 w-full text-center text-sm font-semibold text-[var(--action)]"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        >
          {mode === 'login' ? 'Create an account' : 'Already have an account? Log in'}
        </button>

        {message ? (
          <p className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm text-[var(--muted)]">
            {message}
          </p>
        ) : null}
      </Card>
    </main>
  )
}
