import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { router, useIsFocused } from 'expo-router'
import { usePreventRemove } from 'expo-router/react-navigation'
import { useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@sheetless/domain/account/types'
import type { ProgramSetupOptions, ProgramTemplateSummary } from '@sheetless/domain/program/types'
import { changeSetupVariant, invalidateSetupReview, nativeSetupSteps, refreshSetupSuggestions, setupDraftStateValues, type NativeProgramSetupDraft } from '@sheetless/domain/program/native-setup-draft'
import { Button, Caption, ConfirmDialog, Panel, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { programSetupSuggestionsQueryOptions } from '../setup-suggestions'
import { registerSetupReturn } from '../setup-return'
import { templateSetupQueryOptions, templatesQueryOptions } from '../queries'
import { useReviewedProgramStart } from '../start/useReviewedProgramStart'
import { ProgramVariantSelector } from './ProgramVariantSelector'
import { useTemplateStartCustomizations } from './useTemplateStartCustomizations'
import { SetupEquipmentStep } from './SetupEquipmentStep'
import { SetupNumbersStep } from './SetupNumbersStep'
import { SetupReviewStep } from './SetupReviewStep'
import { SetupLayout } from './SetupLayout'

export function TemplateStartSetup({ user, profile, template, setup, familyMembers, draft, update, clear, finderDays }: {
  user: User; profile: UserProfile; template: ProgramTemplateSummary; setup: ProgramSetupOptions; familyMembers: ProgramTemplateSummary[]
  draft: NativeProgramSetupDraft; update: (updater: (draft: NativeProgramSetupDraft) => NativeProgramSetupDraft) => void
  clear: () => void; finderDays?: number
}) {
  const client = useQueryClient()
  const focused = useIsFocused()
  const [variant, setVariant] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [abandonOpen, setAbandonOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const ownerKey = `${user.id}:${draft.draftId}`
  const owner = useRef<string | null>(ownerKey)
  useLayoutEffect(() => { owner.current = ownerKey; return () => { owner.current = null } }, [ownerKey])
  const customizations = useTemplateStartCustomizations(setup, {
    value: draft.customizations, onChange: (updater) => update((current) => invalidateSetupReview({ ...current, customizations: updater(current.customizations) })),
  })
  const start = useReviewedProgramStart({ user, profile, setup, draft, update, reviewNeeded: customizations.reviewNeeded })
  const stepIndex = nativeSetupSteps.indexOf(draft.step)
  const locked = busy || start.pending || start.frozen
  const missing = setupDraftStateValues(draft).some((state) => state.value === null)
  const back = () => {
    if (locked) return
    if (stepIndex > 0) update((current) => ({ ...current, step: nativeSetupSteps[stepIndex - 1] }))
    else if (router.canGoBack()) router.back()
    else router.replace('/(tabs)/program')
  }
  usePreventRemove(focused && !leaving && (start.pending || busy || (stepIndex > 0 && !start.frozen)), () => {
    if (!start.pending && !busy) back()
  })
  useEffect(() => {
    if (!leaving) return
    clear()
    if (router.canGoBack()) router.back()
    else router.dismissTo('/(tabs)/program')
  }, [clear, leaving])
  const switchVariant = async () => {
    if (!variant || busy || start.pending || (start.frozen && !start.needsFreshReview)) return
    setBusy(true)
    setError(null)
    try {
      const [snapshot] = await Promise.all([
        client.fetchQuery({ ...programSetupSuggestionsQueryOptions(user, variant, profile), staleTime: 0 }),
        client.fetchQuery({ ...templateSetupQueryOptions(user, variant), staleTime: 0 }),
        client.fetchQuery({ ...templatesQueryOptions(user), staleTime: 0 }),
      ])
      if (owner.current !== ownerKey) return
      start.refresh()
      update((current) => changeSetupVariant(current, snapshot))
      router.setParams({ templateId: variant, draftId: draft.draftId })
      setVariant(null)
    } catch (failure) {
      if (owner.current === ownerKey) setError(failure instanceof Error ? failure.message : 'Could not load this schedule.')
    } finally { if (owner.current === ownerKey) setBusy(false) }
  }
  const retryHistory = async () => {
    setBusy(true)
    setError(null)
    try {
      const snapshot = await client.fetchQuery({ ...programSetupSuggestionsQueryOptions(user, draft.templateId, profile), staleTime: 0 })
      if (owner.current === ownerKey) update((current) => refreshSetupSuggestions(current, snapshot))
    } catch (failure) {
      if (owner.current === ownerKey) setError(failure instanceof Error ? failure.message : 'Suggestions could not load.')
    } finally { if (owner.current === ownerKey) setBusy(false) }
  }
  const nextDisabled = locked || (draft.step === 'numbers' && missing) || (draft.step === 'equipment' && customizations.reviewNeeded)
  return <>
    <SetupLayout title={template.name} step={draft.step} footer={<>
      {error ? <Text size="sm" tone="danger">{error}</Text> : null}
      {draft.step === 'review' && start.error && (!start.frozen || start.needsFreshReview) ? <Button label="Reload setup" variant="default"
        disabled={busy || start.pending} onPress={() => setVariant(draft.templateId)} /> : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button label="Back" variant="default" disabled={locked} onPress={back} style={{ flex: 1 }} />
        {draft.step === 'review' ? <Button label={start.frozen ? 'Retry same start' : start.review?.activeProgram ? 'Replace current plan' : 'Start plan'}
          style={{ flex: 2 }} loading={start.pending} disabled={!start.ready || start.pending || busy} onPress={start.requestStart} />
          : <Button label={draft.step === 'equipment' ? 'Review plan' : 'Continue'} disabled={nextDisabled} style={{ flex: 2 }}
            onPress={() => update((current) => ({ ...current, step: nativeSetupSteps[stepIndex + 1] }))} />}
      </View>
      <Button label="Abandon setup" variant="subtle" disabled={locked} onPress={() => setAbandonOpen(true)} />
    </>}>
      {draft.step === 'schedule' ? <>
        <Text weight={800}>Choose a schedule you can keep</Text>
        <Caption>Sessions follow this plan’s sequence. There are no fixed weekdays to configure.</Caption>
        {finderDays ? <Caption>You selected {finderDays} available day{finderDays === 1 ? '' : 's'} in Find My Plan.</Caption> : null}
        <ProgramVariantSelector members={familyMembers} selectedTemplateId={template.id} disabled={locked}
          onSelect={(next) => { if (next !== draft.templateId) setVariant(next) }} />
        <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
          <Text weight={800}>{template.daysPerWeek} days each week · {setup.previewWeeks.length} weeks</Text>
          {setup.sessions.map((session, index) => <Text key={session.id}>{index + 1}. {session.title}</Text>)}
          <Caption>{template.progressionLabel}</Caption>
        </Panel>
      </> : null}
      {draft.step === 'numbers' ? <SetupNumbersStep draft={draft} update={update} disabled={locked} retrying={busy} advanced={profile.experienceMode === 'full'} onRetry={() => void retryHistory()} /> : null}
      {draft.step === 'equipment' ? <SetupEquipmentStep setup={setup} equipmentProfile={profile.equipmentProfile} customizations={customizations} disabled={locked} /> : null}
      {draft.step === 'review' ? <SetupReviewStep user={user} draft={draft} start={start} onEdit={(step) => update((current) => ({ ...current, step }))} onResume={(sessionId) => {
        if (registerSetupReturn(client, user.id, draft.draftId, sessionId)) router.push({ pathname: '/session/[sessionId]', params: { sessionId } })
      }} /> : null}
    </SetupLayout>
    <ConfirmDialog open={Boolean(variant)} title={variant === draft.templateId ? 'Reload programme setup?' : 'Change your schedule?'}
      confirmLabel={variant === draft.templateId ? 'Reload and reset' : 'Change schedule'} cancelLabel="Keep editing" isPending={busy}
      error={error} onCancel={() => { if (!busy) setVariant(null) }} onConfirm={() => void switchVariant()}>
      <Text size="sm" tone="dimmed">{variant === draft.templateId ? 'Reloading uses the newest programme definition and resets' : 'Changing the schedule resets'} starting numbers, movement changes, added accessories, and equipment review. Your units, rounding, and percentages are kept.</Text>
    </ConfirmDialog>
    <ConfirmDialog open={abandonOpen} title="Abandon this setup?" confirmLabel="Abandon setup" cancelLabel="Keep editing" tone="danger"
      onCancel={() => setAbandonOpen(false)} onConfirm={() => setLeaving(true)}>
      <Text size="sm" tone="dimmed">Your unsaved setup will be removed. Your current plan and completed workouts stay as they are.</Text>
    </ConfirmDialog>
  </>
}
