import { createFileRoute } from '@tanstack/react-router'
import { AuthCallbackPage } from '~/domains/account/components/AuthCallbackPage'

export const Route = createFileRoute('/auth/callback')({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === 'string' ? search.code : undefined,
    tokenHash: typeof search.token_hash === 'string' ? search.token_hash : undefined,
    type: typeof search.type === 'string' ? search.type : undefined,
    error: typeof search.error === 'string' ? search.error : undefined,
    errorDescription:
      typeof search.error_description === 'string' ? search.error_description : undefined,
  }),
  component: AuthCallbackRoute,
})

function AuthCallbackRoute() {
  return <AuthCallbackPage search={Route.useSearch()} />
}
