import { createFileRoute } from '@tanstack/react-router'
import { HISTORY_TAB_VALUES, type HistoryTab } from '~/domains/history/lib/history-tabs'
import { programOverviewQueryOptions } from '~/domains/program/queries'
import { historyDashboardQueryOptions } from '~/domains/history/queries'
import { loadRouteQueries } from '~/shared/lib/route-loading'

export const Route = createFileRoute('/history')({
  validateSearch: (search: Record<string, unknown>): { tab?: HistoryTab } => ({
    tab: HISTORY_TAB_VALUES.includes(search.tab as HistoryTab) ? (search.tab as HistoryTab) : undefined,
  }),
  loader: async ({ context }) => {
    if (context.user) {
      await loadRouteQueries(context.queryClient, [
        historyDashboardQueryOptions(context.user.id),
        programOverviewQueryOptions(context.user.id),
      ])
    }
  },
})
