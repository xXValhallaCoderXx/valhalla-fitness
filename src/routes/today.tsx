import { createFileRoute } from '@tanstack/react-router'
import { historyDashboardQueryOptions } from '~/domains/history/queries'
import { programOverviewQueryOptions } from '~/domains/program/queries'
import { TodayPage } from '~/domains/session/components/TodayPage'
import { todayQueryOptions } from '~/domains/session/queries'
import { loadRouteQuery, prefetchRouteQueries } from '~/shared/lib/route-loading'

export const Route = createFileRoute('/today')({
  loader: async ({ context }) => {
    if (context.user) {
      await Promise.all([
        loadRouteQuery(context.queryClient, todayQueryOptions()),
        prefetchRouteQueries(context.queryClient, [
          historyDashboardQueryOptions(),
          programOverviewQueryOptions(),
        ]),
      ])
    }
  },
  component: TodayRoute,
})

function TodayRoute() {
  const { user } = Route.useRouteContext()
  return <TodayPage user={user} />
}
