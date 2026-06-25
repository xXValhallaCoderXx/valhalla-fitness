import { createFileRoute } from '@tanstack/react-router'
import { SessionPage } from '~/domains/session/components/SessionPage'
import { sessionQueryOptions } from '~/domains/session/queries'
import { loadRouteQuery } from '~/shared/lib/route-loading'

export const Route = createFileRoute('/sessions/$sessionId')({
  loader: async ({ context, params }) => {
    if ((context as any).user) {
      await loadRouteQuery(context.queryClient, sessionQueryOptions(params.sessionId))
    }
  },
  component: SessionRoute,
})

function SessionRoute() {
  const { sessionId } = Route.useParams()
  const user = (Route.useRouteContext() as any).user
  return <SessionPage sessionId={sessionId} user={user} />
}
