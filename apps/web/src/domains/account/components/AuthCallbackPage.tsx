import { Button, Card } from '@mantine/core'
import { useMutation } from '@tanstack/react-query'
import { useHydrated, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Heading, Text } from '~/components'
import { useCompleteAuthRedirect } from '~/domains/account/lib/useCompleteAuthRedirect'
import {
  exchangeCodeForSessionFn,
  setSessionFromTokensFn,
  verifyEmailOtpFn,
} from '~/domains/account/server/auth-functions'

type CallbackInput =
  | { kind: 'code'; code: string }
  | { kind: 'tokenHash'; tokenHash: string; type: string }
  | { kind: 'tokens'; accessToken: string; refreshToken: string }

export type AuthCallbackSearch = {
  code?: string
  tokenHash?: string
  type?: string
  error?: string
  errorDescription?: string
}

const pkceVerifierMissingMessage =
  'This sign-in link was opened without the browser cookie created when it was requested. Request a new magic link from this browser, then open the latest email link in the same browser.'

function getCallbackMessage(message: string | undefined) {
  if (!message) return undefined
  if (message.toLowerCase().includes('pkce code verifier not found')) {
    return pkceVerifierMissingMessage
  }
  return message
}

export function AuthCallbackPage({ search }: { search: AuthCallbackSearch }) {
  const router = useRouter()
  const hydrated = useHydrated()
  const completeAuthRedirect = useCompleteAuthRedirect()
  const [hashParams] = useState(() =>
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.hash.replace(/^#/, '')),
  )
  const hashError = hydrated ? hashParams?.get('error_description') ?? hashParams?.get('error') : null
  const callbackError = search.errorDescription ?? search.error ?? hashError
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
      if (result.ok) await completeAuthRedirect()
    },
  })

  useEffect(() => {
    if (!hydrated || mutation.status !== 'idle' || callbackError) return

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
    if (hashErrorMessage) return

    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    if (accessToken && refreshToken) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      mutation.mutate({ kind: 'tokens', accessToken, refreshToken })
    }
  }, [callbackError, hydrated, hashParams, mutation, search.code, search.tokenHash, search.type])

  const hasInput = Boolean(search.code || (search.tokenHash && search.type) ||
    (hashParams?.get('access_token') && hashParams.get('refresh_token')))
  const failure = callbackError ?? (mutation.isError
    ? 'We could not complete sign in. Check your connection and request a new sign-in link.'
    : mutation.data && !mutation.data.ok
      ? mutation.data.message || 'This sign-in link could not be used. Request a new link.'
      : hydrated && !hasInput
        ? 'This sign-in link is incomplete. Return to sign in to request a new link.'
        : undefined)
  const message = getCallbackMessage(failure) ?? 'Completing sign in...'

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-md" p="lg">
        <Heading order={1} size="h3">
          Complete sign in
        </Heading>
        <Text component="p" mt="xs" size="sm" tone="dimmed">
          {message}
        </Text>
        {failure ? (
          <Button mt="md" onClick={() => router.navigate({ to: '/auth' })}>
            Back to sign in
          </Button>
        ) : null}
      </Card>
    </main>
  )
}
