import { createFileRoute } from '@tanstack/react-router'
import { TemplatesPage } from '~/domains/program/components/TemplatesPage'
import { templatesQueryOptions } from '~/domains/program/queries'
import { todayQueryOptions } from '~/domains/session/queries'
import { loadRouteQueries, loadRouteQuery } from '~/shared/lib/route-loading'

export const Route = createFileRoute('/templates')({
  loader: async ({ context }) => {
    await loadRouteQuery(context.queryClient, templatesQueryOptions())
    if ((context as any).user) {
      await loadRouteQueries(context.queryClient, [todayQueryOptions()])
    }
  },
  component: TemplatesRoute,
})

function TemplatesRoute() {
  const user = (Route.useRouteContext() as any).user
  return <TemplatesPage user={user} />
}
