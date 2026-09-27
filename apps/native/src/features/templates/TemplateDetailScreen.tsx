import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { router, useIsFocused } from 'expo-router'
import type { User } from '@supabase/supabase-js'
import { familyByTemplateId, familyMembersForTemplate } from '@sheetless/domain/program/template-families'
import { Button, EmptyState, Panel, Text } from '@/components'
import { useMe } from '@/lib/account'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { TemplatesLayout } from './catalogue/TemplatesLayout'
import { TemplateDetailContent } from './details/TemplateDetailContent'
import { TemplateSessionPreview } from './details/TemplateSessionPreview'
import { templateSetupQueryOptions, templatesQueryOptions } from './queries'

function backToPlans() {
  if (router.canGoBack()) router.back()
  else router.replace('/program')
}

export function TemplateDetailScreen({ templateId }: { templateId: string }) {
  const { user } = useSession()
  if (!user) return <TemplatesLayout backLabel="Plans" onBack={backToPlans}>
    <EmptyState title="Sign in to browse plans">Your plan library is available after signing in.</EmptyState>
  </TemplatesLayout>
  return <AccountTemplateDetail key={`${user.id}:${templateId}`} user={user} templateId={templateId} />
}

function AccountTemplateDetail({ user, templateId }: { user: User; templateId: string }) {
  const profile = useMe()
  const focused = useIsFocused()
  const [previewOpen, setPreviewOpen] = useState(false)
  const templates = useQuery(templatesQueryOptions(user))
  const template = templates.data?.find((item) => item.id === templateId)
  const setup = useQuery({ ...templateSetupQueryOptions(user, templateId), enabled: Boolean(template?.available) })
  const openSetup = () => {
    setPreviewOpen(false)
    router.push({ pathname: '/template/[templateId]/setup', params: { templateId } })
  }
  const footer = template?.available && !templates.isError ? <Button label="Set this up" fullWidth onPress={openSetup} /> : undefined

  return <TemplatesLayout backLabel="Plans" onBack={backToPlans} footer={footer}>
    {templates.isError ? <>
      <EmptyState title="Plan could not load">
        {templates.error instanceof Error ? templates.error.message : 'Try again in a moment.'}
      </EmptyState>
      <Button label="Retry plan" variant="default" loading={templates.isFetching} fullWidth onPress={() => void templates.refetch()} />
    </> : templates.isPending ? <Panel style={{ padding: spacing.md }}>
      <Text tone="dimmed">Loading plan…</Text>
    </Panel> : !template ? <EmptyState title="Plan not found">This plan is no longer available.</EmptyState> : <>
      {profile.isError ? <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
        <Text size="sm">{profile.data ? 'Using your last loaded display preference.' : 'Display preference could not load. Showing Simple.'}</Text>
        <Button label="Retry display preference" variant="subtle" loading={profile.isFetching} onPress={() => void profile.refetch()} />
      </Panel> : null}
      <TemplateDetailContent
        template={template}
        family={familyByTemplateId.get(templateId)}
        members={familyMembersForTemplate(templateId, templates.data ?? [])}
        setup={setup.data}
        advanced={profile.data?.experienceMode === 'full'}
        previewLoading={setup.isPending && template.available}
        previewError={setup.isError ? setup.error instanceof Error ? setup.error.message : 'The plan preview could not load.' : null}
        retrying={setup.isFetching}
        onRetry={() => void setup.refetch()}
        onPreview={() => setPreviewOpen(true)}
      />
      {previewOpen && focused && setup.data ? <TemplateSessionPreview
        setup={setup.data}
        scheduleLabel={template.variantLabel ?? template.name}
        onClose={() => setPreviewOpen(false)}
        onSetup={openSetup}
      /> : null}
    </>}
  </TemplatesLayout>
}
