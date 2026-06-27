import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { AuthPage } from '~/domains/account/components/AuthPage'

export const Route = createFileRoute('/auth')({
  component: AuthRoute,
})

function AuthRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  if (pathname === '/auth/callback') return <Outlet />
  return <AuthPage />
}
