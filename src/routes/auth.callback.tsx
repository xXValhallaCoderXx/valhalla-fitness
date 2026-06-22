import { useMutation } from '@tanstack/react-query'
import { Button, Card } from '@mantine/core'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  exchangeCodeForSessionFn,
  setSessionFromTokensFn,
  verifyEmailOtpFn,
} from '~/server/auth'

type CallbackInput =
  | { kind: 'code'; code: string }
  | { kind: 'tokenHash'; tokenHash: string; type: string }
  | { kind: 'tokens'; accessToken: string; refreshToken: string }

export const Route = createFileRoute('/auth/callback')({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === 'string' ? search.code : undefined,
    tokenHash: typeof search.token_hash === 'string' ? search.token_hash : undefined,
    type: typeof search.type === 'string' ? search.type : undefined,
    error: typeof search.error === 'string' ? search.error : undefined,
    errorDescription:
      typeof search.error_description === 'string' ? search.error_description : undefined,
  }),
  component: AuthCallback,
})

function AuthCallback() {
  const router = useRouter()
  const search = Route.useSearch()
  const [hashParams] = useState(() =>
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.hash.replace(/^#/, '')),
  )
  const mutation = useMutation({
    mutationFn: (input: CallbackInput) => {
      if (input.kind === 'code') {
        return exchangeCodeForSessionFn({ data: { code: input.code } })
      }
      if (input.kind === 'tokenHash') {
        return verifyEmailOtpFn({ data: { tokenHash: input.tokenHash, type: input.type } })
      }
      return setSessionFromTokensFn({
        data: {
          accessToken: input.accessToken,
          refreshToken: input.refreshToken,
        },
      })
    },
    onSuccess: async (result) => {
      if (result.ok) {
        await router.invalidate()
        await router.navigate({ to: '/today' })
      }
    },
  })

  useEffect(() => {
    if (mutation.status !== 'idle' || search.error) return

    if (search.code) {
      mutation.mutate({ kind: 'code', code: search.code })
      return
    }

    if (search.tokenHash && search.type) {
      mutation.mutate({
        kind: 'tokenHash',
        tokenHash: search.tokenHash,
        type: search.type,
      })
      return
    }

    if (!hashParams) return
    const hashErrorMessage = hashParams.get('error_description') ?? hashParams.get('error')
    if (hashErrorMessage) {
      return
    }

    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    if (accessToken && refreshToken) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      mutation.mutate({ kind: 'tokens', accessToken, refreshToken })
    }
  }, [hashParams, mutation, search.code, search.error, search.tokenHash, search.type])

  const hashError = hashParams?.get('error_description') ?? hashParams?.get('error')
  const callbackError = search.errorDescription ?? search.error ?? hashError
  const message = callbackError
    ? callbackError
    : mutation.data?.message ?? 'Completing sign in...'

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-md">
        <h1 className="text-lg font-bold">Auth callback</h1>
        <p className="mt-2 text-sm text-[var(--mantine-color-dimmed)]">{message}</p>
        {callbackError || (mutation.data && !mutation.data.ok) ? (
          <Button className="mt-4" onClick={() => router.navigate({ to: '/auth' })}>
            Back to sign in
          </Button>
        ) : null}
      </Card>
    </main>
  )
}
