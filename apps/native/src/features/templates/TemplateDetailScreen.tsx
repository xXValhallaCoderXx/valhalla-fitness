import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { familyMembersForTemplate } from '@sheetless/domain/program/template-families'
import { Button, EmptyState, PageHeader, Panel, Screen, Text } from '@/components'
import { todayQueryOptions } from '@/features/session/queries'
import { useMe } from '@/lib/account'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { TemplateStartSetup } from './setup/TemplateStartSetup'
import { templateSetupQueryOptions, templatesQueryOptions } from './queries'

export function TemplateDetailScreen({ templateId }: { templateId: string }) {
  const { user } = useSession()
  const profile = useMe()
  const [setupRevision, setSetupRevision] = useState(0)
  const [reloadPending, setReloadPending] = useState(false)
  const [reloadError, setReloadError] = useState<string | null>(null)
  const templates = useQuery({ ...templatesQueryOptions(user!), enabled: Boolean(user) })
  const template = templates.data?.find((item) => item.id === templateId)
  const setup = useQuery({
    ...templateSetupQueryOptions(user!, templateId),
    enabled: Boolean(user && template),
  })
  const today = useQuery({
    ...todayQueryOptions(user!, profile.data?.timezone ?? undefined),
    enabled: Boolean(user && profile.data),
  })

  const reloadSetup = async () => {
    if (reloadPending) return false
    setReloadPending(true)
    setReloadError(null)
    try {
      const result = await setup.refetch()
      if (result.isError) throw result.error
      setSetupRevision((current) => current + 1)
      return true
    } catch (error) {
      setReloadError(error instanceof Error ? error.message : 'Unable to reload programme setup.')
      return false
    } finally {
      setReloadPending(false)
    }
  }

  if (
    templates.isPending ||
    profile.isPending ||
    today.isPending ||
    (template && setup.isPending)
  ) {
    return (
      <Screen>
        <PageHeader title={template?.name ?? 'Programme'} />
        <Panel style={{ padding: spacing.md }}>
          <Text tone="dimmed">Loading programme setup…</Text>
        </Panel>
      </Screen>
    )
  }

  if (templates.isError || profile.isError || today.isError || setup.isError) {
    const error = templates.error ?? profile.error ?? today.error ?? setup.error
    return (
      <Screen>
        <PageHeader title="Programme" />
        <EmptyState title="Programme could not load">
          {error instanceof Error ? error.message : 'Try again in a moment.'}
        </EmptyState>
        <Button
          label={reloadPending ? 'Retrying…' : 'Retry'}
          variant="default"
          loading={reloadPending}
          fullWidth
          onPress={() => {
            if (setup.isError) void reloadSetup()
            else {
              void templates.refetch()
              void profile.refetch()
              void today.refetch()
            }
          }}
        />
      </Screen>
    )
  }

  if (!user || !template || !setup.data || !profile.data || !today.data) {
    return (
      <Screen>
        <PageHeader title="Programme" />
        <EmptyState title="Programme not found">This programme is no longer available.</EmptyState>
      </Screen>
    )
  }

  return (
    <TemplateStartSetup
      key={`${templateId}:${setupRevision}`}
      user={user}
      profile={profile.data}
      today={today.data}
      template={template}
      setup={setup.data}
      familyMembers={familyMembersForTemplate(templateId, templates.data)}
      reloadPending={reloadPending}
      reloadError={reloadError}
      onReloadSetup={reloadSetup}
    />
  )
}
