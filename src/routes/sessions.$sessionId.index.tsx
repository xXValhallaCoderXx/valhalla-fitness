import { createFileRoute } from '@tanstack/react-router'
import { SessionPage } from '~/domains/session/components/SessionPage'

export const Route = createFileRoute('/sessions/$sessionId/')({
  component: SessionRoute,
})

function SessionRoute() {
  const { sessionId } = Route.useParams()
  const user = (Route.useRouteContext() as any).user
  return <SessionPage sessionId={sessionId} user={user} />
}
