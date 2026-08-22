import { createFileRoute } from '@tanstack/react-router'
import { meQueryOptions } from '~/domains/account/queries'
import { TemplateStartPage } from '~/domains/program/components/TemplateStartPage'
import { accountTemplatesQueryOptions, programSetupOptionsQueryOptions, publicTemplatesQueryOptions } from '~/domains/program/queries'
import { todayQueryOptions } from '~/domains/session/queries'
import { loadRouteQueries, loadRouteQuery } from '~/shared/lib/route-loading'

export const Route = createFileRoute('/templates/$templateId/start')({
  validateSearch: (search: Record<string, unknown>): { variant?: string } => ({
    variant: typeof search.variant === 'string' ? search.variant : undefined,
  }),
  loaderDeps: ({ search: { variant } }) => ({ variant }),
  loader: async ({ context, params, deps }) => {
    await loadRouteQuery(
      context.queryClient,
      context.user
        ? accountTemplatesQueryOptions(context.user.id)
        : publicTemplatesQueryOptions(),
    )
    if (context.user) {
      await loadRouteQueries(context.queryClient, [
        meQueryOptions(context.user.id),
        todayQueryOptions(context.user.id),
        // Preload the variant the page will actually render (falls back to the route template id).
        programSetupOptionsQueryOptions(
          context.user.id,
          deps.variant ?? params.templateId,
        ),
      ])
    }
  },
  component: TemplateStartRoute,
})

function TemplateStartRoute() {
  const { templateId } = Route.useParams()
  const { variant } = Route.useSearch()
  const { user } = Route.useRouteContext()
  return <TemplateStartPage templateId={templateId} variant={variant} user={user} />
}
