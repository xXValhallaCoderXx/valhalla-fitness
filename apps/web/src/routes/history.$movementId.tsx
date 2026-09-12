import { createFileRoute } from '@tanstack/react-router'
import { INSIGHT_RANGES, type InsightRange } from '~/domains/history/lib/insight-ranges'
import { historyDashboardQueryOptions } from '~/domains/history/queries'
import { programOverviewQueryOptions } from '~/domains/program/queries'
import { loadRouteQueries } from '~/shared/lib/route-loading'

export const Route = createFileRoute('/history/$movementId')({
  validateSearch: (search: Record<string, unknown>): { range?: InsightRange } => ({
    range: INSIGHT_RANGES.includes(search.range as InsightRange) ? (search.range as InsightRange) : undefined,
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
