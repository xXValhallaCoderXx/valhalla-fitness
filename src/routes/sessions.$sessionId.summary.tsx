import { createFileRoute } from '@tanstack/react-router'
import { SessionSummaryPage } from '~/domains/session/components/SessionSummaryPage'
import { sessionQueryOptions } from '~/domains/session/queries'
import { loadRouteQuery } from '~/shared/lib/route-loading'

export const Route = createFileRoute('/sessions/$sessionId/summary')({
  loader: async ({ context, params }) => {
    if ((context as any).user) {
      await loadRouteQuery(context.queryClient, sessionQueryOptions(params.sessionId))
    }
  },
  component: SessionSummaryRoute,
})

function SessionSummaryRoute() {
  const { sessionId } = Route.useParams()
  const user = (Route.useRouteContext() as any).user
  return <SessionSummaryPage sessionId={sessionId} user={user} />
}
