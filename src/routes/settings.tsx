import { createFileRoute } from '@tanstack/react-router'
import { SettingsPage } from '~/domains/account/components/SettingsPage'
import { meQueryOptions } from '~/domains/account/queries'
import { loadRouteQuery } from '~/shared/lib/route-loading'

export const Route = createFileRoute('/settings')({
  validateSearch: (search: Record<string, unknown>): { focus?: 'estimates' } => ({
    focus: search.focus === 'estimates' ? 'estimates' : undefined,
  }),
  loader: async ({ context }) => {
    if ((context as any).user) await loadRouteQuery(context.queryClient, meQueryOptions())
  },
  component: SettingsRoute,
})

function SettingsRoute() {
  const user = (Route.useRouteContext() as any).user
  return <SettingsPage user={user} />
}
