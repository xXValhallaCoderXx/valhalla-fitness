import { createFileRoute } from '@tanstack/react-router'
import { TemplatesPage } from '~/domains/program/components/TemplatesPage'
import { programOverviewQueryOptions, templatesQueryOptions } from '~/domains/program/queries'
import { todayQueryOptions } from '~/domains/session/queries'
import { loadRouteQueries, loadRouteQuery } from '~/shared/lib/route-loading'

export const Route = createFileRoute('/templates')({
  // Boolean flag (not a numeric value): TanStack coerces `?find=1` to the number 1, which
  // would never match a string check. `?find=true` round-trips unambiguously.
  validateSearch: (search: Record<string, unknown>): { find?: true } => ({
    find: search.find === true || search.find === 'true' || search.find === 1 || search.find === '1' ? true : undefined,
  }),
  loader: async ({ context }) => {
    await loadRouteQuery(context.queryClient, templatesQueryOptions())
    if (context.user) {
      await loadRouteQueries(context.queryClient, [todayQueryOptions(), programOverviewQueryOptions()])
    }
  },
  component: TemplatesRoute,
})

function TemplatesRoute() {
  const { user } = Route.useRouteContext()
  return <TemplatesPage user={user} />
}
