import { useQuery } from '@tanstack/react-query'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { PageLoadError, PageSkeleton } from '~/components'
import type { AuthUser } from '~/domains/account/server/auth-functions'
import { availableTemplatesQueryOptions } from '~/domains/program/queries'
import { todayQueryOptions } from '~/domains/session/queries'
import { TemplateCatalogue } from './TemplateCatalogue'

export function TemplatesPage({ user }: { user: AuthUser | null }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  if (pathname !== '/templates') return <Outlet />
  return <TemplatesIndexRoute user={user} />
}

function TemplatesIndexRoute({ user }: { user: AuthUser | null }) {
  const templatesQuery = useQuery(availableTemplatesQueryOptions(user?.id ?? null))
  const todayQuery = useQuery({
    ...todayQueryOptions(user?.id ?? ''),
    enabled: Boolean(user),
  })

  if (templatesQuery.isPending) return <PageSkeleton />
  if (templatesQuery.isError) return <PageLoadError error={templatesQuery.error} onRetry={() => void templatesQuery.refetch()} />

  // The library itself is public — the loader already fetches it signed-out. Only starting a
  // programme needs an account, and the card actions gate that.
  if (!user) return <TemplateCatalogue templates={templatesQuery.data} />

  if (todayQuery.isPending) return <PageSkeleton />
  if (todayQuery.isError) return <PageLoadError error={todayQuery.error} onRetry={() => void todayQuery.refetch()} />

  return <TemplateCatalogue templates={templatesQuery.data} today={todayQuery.data} />
}
