import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { ProgramStartReceipt } from '@sheetless/domain/program/reviewed-start'
import type { NativeProgramSetupDraft } from '@sheetless/domain/program/native-setup-draft'
import type { ProgramSetupSuggestionSnapshot } from '@sheetless/domain/program/setup-suggestions'
import { familyMembersForTemplate } from '@sheetless/domain/program/template-families'
import { Button, EmptyState, PageHeader, Screen, Text } from '@/components'
import { useMe } from '@/lib/account'
import { useSession } from '@/lib/session-provider'
import { TemplateStartSetup } from './setup/TemplateStartSetup'
import { templateSetupQueryOptions, templatesQueryOptions } from './queries'
import { programSetupSuggestionsQueryOptions } from './setup-suggestions'
import { initializeProgramSetupDraft, programSetupDraftKey, programSetupReceiptKey, useProgramSetupDraft } from './setup-draft'
import { ProgramSetupSuccess } from './start/ProgramSetupSuccess'

type SetupParams = { templateId: string; draftId?: string; source?: string; finderDays?: string }
export function TemplateSetupScreen(props: SetupParams) {
  const { user } = useSession()
  return user ? <SetupContent key={`${user.id}:${props.draftId ?? props.templateId}`} user={user} {...props} /> : null
}

function SetupContent({ user, templateId, draftId, finderDays }: SetupParams & { user: User }) {
  const client = useQueryClient()
  const existing = useQuery<NativeProgramSetupDraft>({ queryKey: programSetupDraftKey(user.id, draftId ?? 'uninitialized'), queryFn: skipToken, enabled: false })
  const receipt = useQuery<ProgramStartReceipt>({ queryKey: programSetupReceiptKey(user.id, draftId ?? 'uninitialized'), queryFn: skipToken, enabled: false, gcTime: Infinity })
  const validDraft = existing.data?.accountId === user.id && existing.data?.draftId === draftId ? existing.data : undefined
  const selectedId = validDraft?.templateId ?? templateId
  const profile = useMe()
  const templates = useQuery(templatesQueryOptions(user))
  const template = templates.data?.find((item) => item.id === selectedId)
  const setup = useQuery({ ...templateSetupQueryOptions(user, selectedId), enabled: Boolean(template) })
  const suggestions = useQuery({ ...programSetupSuggestionsQueryOptions(user, selectedId, profile.data), enabled: Boolean(profile.data && template && !draftId) })
  if (receipt.data && draftId) return <ProgramSetupSuccess user={user} draftId={draftId} receipt={receipt.data} />
  if (draftId && !validDraft) return <Screen padTop={false}><PageHeader title="Plan setup" /><EmptyState title="This setup is no longer available">Start a new setup to continue.</EmptyState>
    <Button label="Start new setup" onPress={() => router.replace({ pathname: '/template/[templateId]/setup', params: { templateId } })} /></Screen>
  const failed = profile.isError ? profile : templates.isError ? templates : setup.isError ? setup : suggestions.isError && !validDraft ? suggestions : null
  if (failed) return <Screen padTop={false}><PageHeader title="Plan setup" /><EmptyState title="Programme could not load">{failed.error instanceof Error ? failed.error.message : 'Please try again.'}</EmptyState>
    <Button label="Retry" loading={failed.isFetching} onPress={() => void failed.refetch()} /></Screen>
  if (!profile.data || !templates.data || (template && (!setup.data || (!draftId && !suggestions.data)))) return <Screen padTop={false}><PageHeader title={template?.name ?? 'Plan setup'} /><Text>Loading programme setup…</Text></Screen>
  if (!template || !setup.data) return <Screen padTop={false}><EmptyState title="Programme not found">This programme is no longer available.</EmptyState></Screen>
  return <LoadedSetup user={user} snapshot={validDraft?.snapshot ?? suggestions.data!} routeDraftId={draftId}
    render={(draft, update, clear) => <TemplateStartSetup key={draft.templateId} user={user} profile={profile.data!} template={template} setup={setup.data!}
      familyMembers={familyMembersForTemplate(selectedId, templates.data!)} draft={draft} update={update} clear={clear}
      finderDays={finderDays && Number.isFinite(Number(finderDays)) ? Number(finderDays) : undefined} />}
    clientReceipt={(id, value) => <ProgramSetupSuccess user={user} draftId={id} receipt={value} />} client={client} />
}

function LoadedSetup({ user, snapshot, routeDraftId, render, clientReceipt, client }: {
  user: User; snapshot: ProgramSetupSuggestionSnapshot; routeDraftId?: string
  render: (draft: NativeProgramSetupDraft, update: (fn: (draft: NativeProgramSetupDraft) => NativeProgramSetupDraft) => void, clear: () => void) => React.ReactNode
  clientReceipt: (draftId: string, receipt: ProgramStartReceipt) => React.ReactNode
  client: ReturnType<typeof useQueryClient>
}) {
  const [draftId] = useState(() => routeDraftId ?? client.getQueriesData<NativeProgramSetupDraft>({ queryKey: ['account', user.id, 'program-setup-drafts'] })
    .map(([, value]) => value).findLast((value) => value?.accountId === user.id && value.templateId === snapshot.templateId)?.draftId
    ?? initializeProgramSetupDraft(client, user.id, snapshot))
  const { draft, update, clear } = useProgramSetupDraft(user.id, draftId)
  const receipt = useQuery<ProgramStartReceipt>({ queryKey: programSetupReceiptKey(user.id, draftId), queryFn: skipToken, enabled: false, gcTime: Infinity })
  useEffect(() => { if (!routeDraftId) router.setParams({ draftId }) }, [draftId, routeDraftId])
  if (receipt.data) return clientReceipt(draftId, receipt.data)
  return draft ? render(draft, update, clear) : null
}
