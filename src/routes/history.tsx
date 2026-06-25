import { createFileRoute } from '@tanstack/react-router'
import { HistoryPage } from '~/domains/history/components/HistoryPage'
import { activeProgramQueryOptions } from '~/domains/program/queries'
import { historyDashboardQueryOptions } from '~/domains/history/queries'
import { loadRouteQueries } from '~/shared/lib/route-loading'

export const Route = createFileRoute('/history')({
  loader: async ({ context }) => {
    if ((context as any).user) {
      await loadRouteQueries(context.queryClient, [historyDashboardQueryOptions(), activeProgramQueryOptions()])
    }
  },
  component: HistoryRoute,
})

function HistoryRoute() {
  const user = (Route.useRouteContext() as any).user
  return <HistoryPage user={user} />
}
