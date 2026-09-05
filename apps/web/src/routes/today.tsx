import { createFileRoute } from '@tanstack/react-router'
import { todayHistorySupportQueryOptions } from '~/domains/history/queries'
import { TodayPage } from '~/domains/session/components/TodayPage'
import { todayQueryOptions } from '~/domains/session/queries'
import { loadRouteQuery, prefetchRouteQueries } from '~/shared/lib/route-loading'

export const Route = createFileRoute('/today')({
  loader: async ({ context }) => {
    if (context.user) {
      await Promise.all([
        loadRouteQuery(context.queryClient, todayQueryOptions(context.user.id)),
        prefetchRouteQueries(context.queryClient, [
          todayHistorySupportQueryOptions(context.user.id),
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
