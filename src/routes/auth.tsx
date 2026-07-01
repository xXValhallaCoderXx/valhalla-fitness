import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { AuthPage } from '~/domains/account/components/AuthPage'
import { authPolicyQueryOptions } from '~/domains/account/queries'

export const Route = createFileRoute('/auth')({
  // Await on both server and client so the auth form renders with the correct
  // policy on first paint (no flash of password UI on a magic-link-only deploy).
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(authPolicyQueryOptions())
  },
  component: AuthRoute,
})

function AuthRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  if (pathname === '/auth/callback') return <Outlet />
  return <AuthPage />
}
