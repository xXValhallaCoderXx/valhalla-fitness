import { createFileRoute } from '@tanstack/react-router'
import { HISTORY_TAB_VALUES, HistoryPage, type HistoryTab } from '~/domains/history/components/HistoryPage'
import { activeProgramQueryOptions } from '~/domains/program/queries'
import { historyDashboardQueryOptions } from '~/domains/history/queries'
import { loadRouteQueries } from '~/shared/lib/route-loading'

export const Route = createFileRoute('/history')({
  validateSearch: (search: Record<string, unknown>): { tab?: HistoryTab } => ({
    tab: HISTORY_TAB_VALUES.includes(search.tab as HistoryTab) ? (search.tab as HistoryTab) : undefined,
  }),
  loader: async ({ context }) => {
    if ((context as any).user) {
      await loadRouteQueries(context.queryClient, [historyDashboardQueryOptions(), activeProgramQueryOptions()])
    }
  },
  component: HistoryRoute,
})

function HistoryRoute() {
  const user = (Route.useRouteContext() as any).user
  const { tab } = Route.useSearch()
  return <HistoryPage user={user} initialTab={tab} />
}
