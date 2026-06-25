import { Button } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { EmptyState, Page, PageLoadError, PageSkeleton } from '~/components'
import { meQueryOptions } from '~/domains/account/queries'
import { programSetupOptionsQueryOptions, templatesQueryOptions } from '~/domains/program/queries'
import { todayQueryOptions } from '~/domains/session/queries'
import { TemplateStartContent } from './TemplateStartContent'

export function TemplateStartPage({ templateId, user }: { templateId: string; user: unknown }) {
  const router = useRouter()
  const templatesQuery = useQuery(templatesQueryOptions())
  const meQuery = useQuery({
    ...meQueryOptions(),
    enabled: Boolean(user),
  })
  const todayQuery = useQuery({
    ...todayQueryOptions(),
    enabled: Boolean(user),
  })
  const setupQuery = useQuery({
    ...programSetupOptionsQueryOptions(templateId),
    enabled: Boolean(user),
  })

  if (templatesQuery.isPending) return <PageSkeleton />
  if (templatesQuery.isError) return <PageLoadError error={templatesQuery.error} onRetry={() => void templatesQuery.refetch()} />

  const template = templatesQuery.data.find((item) => item.id === templateId)

  if (!template) {
    return (
      <Page>
        <EmptyState
          title="Programme unavailable"
          action={<Button onClick={() => router.navigate({ to: '/templates' })}>Back to templates</Button>}
        >
          This programme is no longer available.
        </EmptyState>
      </Page>
    )
  }

  if (!user) {
    return (
      <Page>
        <EmptyState
          title="Sign in to start this programme"
          action={<Button onClick={() => router.navigate({ to: '/auth' })}>Sign in</Button>}
        >
          Programme setup and saved defaults are tied to your account.
        </EmptyState>
      </Page>
    )
  }

  if (meQuery.isPending || todayQuery.isPending || setupQuery.isPending) return <PageSkeleton />
  if (meQuery.isError) return <PageLoadError error={meQuery.error} onRetry={() => void meQuery.refetch()} />
  if (todayQuery.isError) return <PageLoadError error={todayQuery.error} onRetry={() => void todayQuery.refetch()} />
  if (setupQuery.isError) return <PageLoadError error={setupQuery.error} onRetry={() => void setupQuery.refetch()} />

  if (!meQuery.data) {
    return (
      <Page>
        <EmptyState title="Profile unavailable">Sign in again to start a programme.</EmptyState>
      </Page>
    )
  }

  return (
    <TemplateStartContent
      template={template}
      me={meQuery.data}
      today={todayQuery.data}
      setupOptions={setupQuery.data}
    />
  )
}
