import { createLazyFileRoute } from '@tanstack/react-router'
import { MovementDetailPage } from '~/domains/history/components/movement/MovementDetailPage'

export const Route = createLazyFileRoute('/history/$movementId')({
  component: MovementDetailRoute,
})

function MovementDetailRoute() {
  const { user } = Route.useRouteContext()
  const { movementId } = Route.useParams()
  const { range } = Route.useSearch()
  return <MovementDetailPage user={user} movementId={movementId} initialRange={range} />
}
