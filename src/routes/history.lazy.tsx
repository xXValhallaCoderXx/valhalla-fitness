import { createLazyFileRoute } from '@tanstack/react-router'
import { HistoryPage } from '~/domains/history/components/HistoryPage'

export const Route = createLazyFileRoute('/history')({
  component: HistoryRoute,
})

function HistoryRoute() {
  const { user } = Route.useRouteContext()
  const { tab } = Route.useSearch()
  return <HistoryPage user={user} initialTab={tab} />
}
