import { createFileRoute } from '@tanstack/react-router'
import { ProgramPage } from '~/domains/program/components/ProgramPage'
import { programOverviewQueryOptions } from '~/domains/program/queries'
import { loadRouteQuery } from '~/shared/lib/route-loading'

export const Route = createFileRoute('/program')({
  loader: async ({ context }) => {
    if ((context as any).user) {
      await loadRouteQuery(context.queryClient, programOverviewQueryOptions())
    }
  },
  component: ProgramRoute,
})

function ProgramRoute() {
  const user = (Route.useRouteContext() as any).user
  return <ProgramPage user={user} />
}
