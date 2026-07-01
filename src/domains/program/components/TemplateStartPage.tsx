import { Button, SegmentedControl } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Caption, EmptyState, Page, PageLoadError, PageSkeleton, SectionLabel } from '~/components'
import { meQueryOptions } from '~/domains/account/queries'
import { programSetupOptionsQueryOptions, templatesQueryOptions } from '~/domains/program/queries'
import { familyMembersForTemplate } from '~/domains/program/lib/template-families'
import { todayQueryOptions } from '~/domains/session/queries'
import { TemplateStartContent } from './TemplateStartContent'

export function TemplateStartPage({
  templateId,
  variant,
  user,
}: {
  templateId: string
  variant?: string
  user: unknown
}) {
  const router = useRouter()
  const templatesQuery = useQuery(templatesQueryOptions())

  // The full catalogue is client-side, so family members resolve without an extra request. When a
  // template belongs to a family, `?variant=` picks which concrete variant loads (default: the route
  // template id). Every variant is its own runnable template — the summary lookup + setup options +
  // the started programme all key on `variantId`.
  const members = familyMembersForTemplate(templateId, templatesQuery.data ?? [])
  const variantId = variant && members.some((member) => member.id === variant) ? variant : templateId

  const meQuery = useQuery({
    ...meQueryOptions(),
    enabled: Boolean(user),
  })
  const todayQuery = useQuery({
    ...todayQueryOptions(),
    enabled: Boolean(user),
  })
  const setupQuery = useQuery({
    ...programSetupOptionsQueryOptions(variantId),
    enabled: Boolean(user),
  })

  if (templatesQuery.isPending) return <PageSkeleton />
  if (templatesQuery.isError) return <PageLoadError error={templatesQuery.error} onRetry={() => void templatesQuery.refetch()} />

  const template = templatesQuery.data.find((item) => item.id === variantId)

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

  const activeVariant = members.find((member) => member.id === variantId)
  const scheduleSelector =
    members.length > 1 ? (
      <div className="mb-4">
        <SectionLabel>Choose your schedule</SectionLabel>
        <SegmentedControl
          mt={6}
          fullWidth
          value={variantId}
          onChange={(value) =>
            router.navigate({
              to: '/templates/$templateId/start',
              params: { templateId },
              search: { variant: value },
            })
          }
          data={members.map((member) => ({
            value: member.id,
            label: member.variantShortLabel ?? `${member.daysPerWeek} days`,
          }))}
        />
        {activeVariant?.variantDescription ? (
          <Caption component="p" mt={6} lh={1.5}>
            {activeVariant.variantDescription}
          </Caption>
        ) : null}
      </div>
    ) : undefined

  return (
    // Remount on variant change: TemplateStartContent seeds local state (state values, movement
    // overrides, accessory additions) from the template once, and those reference variant-specific
    // slot ids — a fresh mount resets them cleanly to the newly selected variant.
    <TemplateStartContent
      key={variantId}
      template={template}
      me={meQuery.data}
      today={todayQuery.data}
      setupOptions={setupQuery.data}
      scheduleSelector={scheduleSelector}
    />
  )
}
