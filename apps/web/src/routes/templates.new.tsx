import { createFileRoute } from '@tanstack/react-router'
import { meQueryOptions } from '~/domains/account/queries'
import { loadRouteQuery } from '~/shared/lib/route-loading'

export const Route = createFileRoute('/templates/new')({
  loader: async ({ context }) => {
    if (context.user) {
      // Starting numbers for the grid's required-state panel come from the profile's estimates.
      await loadRouteQuery(context.queryClient, meQueryOptions(context.user.id))
    }
  },
})
