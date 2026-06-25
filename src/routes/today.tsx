import { createFileRoute } from '@tanstack/react-router'
import { TodayPage } from '~/domains/session/components/TodayPage'
import { todayQueryOptions } from '~/domains/session/queries'
import { loadRouteQuery } from '~/shared/lib/route-loading'

export const Route = createFileRoute('/today')({
  loader: async ({ context }) => {
    if ((context as any).user) {
      await loadRouteQuery(context.queryClient, todayQueryOptions())
    }
  },
  component: TodayRoute,
})

function TodayRoute() {
  const user = (Route.useRouteContext() as any).user
  return <TodayPage user={user} />
}
