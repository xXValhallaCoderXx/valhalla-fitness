import { createFileRoute } from '@tanstack/react-router'
import { SessionPage } from '~/domains/session/components/SessionPage'

export const Route = createFileRoute('/sessions/$sessionId/')({
  validateSearch: (search: Record<string, unknown>): { tour?: 'live' } => ({
    tour: search.tour === 'live' ? 'live' : undefined,
  }),
  component: SessionRoute,
})

function SessionRoute() {
  const { sessionId } = Route.useParams()
  const { user } = Route.useRouteContext()
  return <SessionPage sessionId={sessionId} user={user} />
}
