import { createFileRoute } from '@tanstack/react-router'
import { meQueryOptions } from '~/domains/account/queries'
import { TemplateStartPage } from '~/domains/program/components/TemplateStartPage'
import { programSetupOptionsQueryOptions, templatesQueryOptions } from '~/domains/program/queries'
import { todayQueryOptions } from '~/domains/session/queries'
import { loadRouteQueries, loadRouteQuery } from '~/shared/lib/route-loading'

export const Route = createFileRoute('/templates/$templateId/start')({
  loader: async ({ context, params }) => {
    await loadRouteQuery(context.queryClient, templatesQueryOptions())
    if ((context as any).user) {
      await loadRouteQueries(context.queryClient, [
        meQueryOptions(),
        todayQueryOptions(),
        programSetupOptionsQueryOptions(params.templateId),
      ])
    }
  },
  component: TemplateStartRoute,
})

function TemplateStartRoute() {
  const { templateId } = Route.useParams()
  const user = (Route.useRouteContext() as any).user
  return <TemplateStartPage templateId={templateId} user={user} />
}
