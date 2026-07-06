import { createFileRoute, Outlet } from '@tanstack/react-router'
import { sessionQueryOptions } from '~/domains/session/queries'
import { loadRouteQuery } from '~/shared/lib/route-loading'

export const Route = createFileRoute('/sessions/$sessionId')({
  loader: async ({ context, params }) => {
    if (context.user) {
      await loadRouteQuery(context.queryClient, sessionQueryOptions(params.sessionId))
    }
  },
  component: SessionLayout,
})

function SessionLayout() {
  return <Outlet />
}
