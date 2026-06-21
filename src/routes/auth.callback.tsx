import { useMutation } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { exchangeCodeForSessionFn } from '~/server/auth'
import { Button, Card } from '~/components/ui'

export const Route = createFileRoute('/auth/callback')({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === 'string' ? search.code : undefined,
  }),
  component: AuthCallback,
})

function AuthCallback() {
  const router = useRouter()
  const search = Route.useSearch()
  const mutation = useMutation({
    mutationFn: (code: string) => exchangeCodeForSessionFn({ data: { code } }),
    onSuccess: async (result) => {
      if (result.ok) {
        await router.invalidate()
        await router.navigate({ to: '/today' })
      }
    },
  })

  useEffect(() => {
    if (search.code && mutation.status === 'idle') {
      mutation.mutate(search.code)
    }
  }, [mutation, search.code])

  const message = !search.code
    ? 'Missing auth code.'
    : mutation.data?.message ?? 'Completing sign in...'

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-md">
        <h1 className="text-lg font-bold">Auth callback</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{message}</p>
        {mutation.data && !mutation.data.ok ? (
          <Button className="mt-4" onClick={() => router.navigate({ to: '/auth' })}>
            Back to sign in
          </Button>
        ) : null}
      </Card>
    </main>
  )
}
