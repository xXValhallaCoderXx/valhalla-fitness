import { Button } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import { EmptyState, Page, PageLoadError, PageSkeleton } from '~/components'
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
  const router = useRouter()
  const templatesQuery = useQuery(availableTemplatesQueryOptions(user?.id ?? null))
  const todayQuery = useQuery({
    ...todayQueryOptions(user?.id ?? ''),
    enabled: Boolean(user),
  })

  if (templatesQuery.isPending) return <PageSkeleton />
  if (templatesQuery.isError) return <PageLoadError error={templatesQuery.error} onRetry={() => void templatesQuery.refetch()} />

  if (!user) {
    return (
      <Page>
        <EmptyState
          title="Sign in to start a program"
          action={<Button onClick={() => router.navigate({ to: '/auth' })}>Sign in</Button>}
        >
          Templates are visible, but starting a program requires a Supabase account.
        </EmptyState>
      </Page>
    )
  }

  if (todayQuery.isPending) return <PageSkeleton />
  if (todayQuery.isError) return <PageLoadError error={todayQuery.error} onRetry={() => void todayQuery.refetch()} />

  return <TemplateCatalogue templates={templatesQuery.data} today={todayQuery.data} />
}
