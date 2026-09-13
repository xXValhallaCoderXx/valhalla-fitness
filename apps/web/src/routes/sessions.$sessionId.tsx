import { createFileRoute, Outlet } from '@tanstack/react-router'
import { WorkoutUnavailable } from '~/domains/session/components/SessionLoadError'
import { loadSessionRoute } from '~/domains/session/lib/session-route'

export const Route = createFileRoute('/sessions/$sessionId')({
  loader: async ({ context, params }) => {
    if (context.user) {
      await loadSessionRoute(context.queryClient, context.user.id, params.sessionId)
    }
  },
  notFoundComponent: WorkoutUnavailable,
  component: SessionLayout,
})

function SessionLayout() {
  return <Outlet />
}
