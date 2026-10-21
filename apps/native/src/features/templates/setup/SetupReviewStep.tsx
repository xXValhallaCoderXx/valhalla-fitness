import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { NativeProgramSetupDraft } from '@sheetless/domain/program/native-setup-draft'
import { setupDraftStateValues } from '@sheetless/domain/program/native-setup-draft'
import { getMovementName } from '@sheetless/domain/movement/movements'
import { formatStateType } from '@sheetless/domain/program/template-start-utils'
import { Button, Caption, ConfirmDialog, Panel, SectionLabel, Text } from '@/components'
import { ProgressionReviewSheet } from '@/features/program/progression/ProgressionReviewSheet'
import { getProgramSetupPendingReview } from '@sheetless/data/program/setup-pending-review'
import { buildUserContext } from '@/lib/account'
import { spacing } from '@/lib/tokens'
import type { ReviewedProgramStartController } from '../start/useReviewedProgramStart'
import { SetupFirstWorkout } from './SetupFirstWorkout'

export function SetupReviewStep({ user, draft, start, onResume, onEdit }: {
  user: User; draft: NativeProgramSetupDraft; start: ReviewedProgramStartController; onResume: (sessionId: string) => void; onEdit: (step: NativeProgramSetupDraft['step']) => void
}) {
  const [reviewOpen, setReviewOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const review = start.review
  const pending = useQuery({ queryKey: ['account', user.id, 'setup-pending-review', review?.pendingDecisionIds ?? []],
    queryFn: () => getProgramSetupPendingReview(buildUserContext(user), review?.pendingDecisionIds ?? []), enabled: reviewOpen, staleTime: 0 })
  const group = pending.data?.find((item) => item.programId === selectedGroup)
  return <>
    <Text weight={800}>Review your plan</Text>
    <Caption>{draft.units} · round to {draft.rounding} · {draft.customizations.equipmentMode === 'free_weight' ? 'Free weights only' : 'All equipment'}</Caption>
    <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
      <SectionLabel>Schedule and equipment</SectionLabel>
      <Text>{review?.setupOptions?.sessions.length ?? '—'} sessions each week · {review?.setupOptions?.previewWeeks.length ?? '—'} weeks</Text>
      {review?.setupOptions?.sessions.map((session) => <Caption key={session.id}>{session.title}</Caption>)}
      {draft.customizations.movementOverrides.map((item) => <Caption key={`${item.slotId}:${item.phaseKey}`}>{getMovementName(item.originalMovementId)} → {getMovementName(item.replacementMovementId)} · {item.phaseKey}</Caption>)}
      {draft.customizations.accessoryAdditions.map((item) => <Caption key={item.clientId}>Added {getMovementName(item.movementId)} · {review?.setupOptions?.sessions.find((session) => session.id === item.sessionId)?.title ?? item.sessionId}</Caption>)}
      {draft.customizations.equipmentMode === 'free_weight' ? draft.customizations.choiceState.choices.map((item) => <Caption key={`${item.templateSessionId}:${item.slotId}:${item.phaseKey}`}>{getMovementName(item.sourceMovementId)} → {getMovementName(item.replacementMovementId)} · {item.phaseKey}</Caption>) : null}
      <Button label="Edit schedule" variant="subtle" disabled={start.pending || start.frozen} onPress={() => onEdit('schedule')} />
      <Button label="Edit equipment and movements" variant="subtle" disabled={start.pending || start.frozen} onPress={() => onEdit('equipment')} />
    </Panel>
    <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
      <SectionLabel>Starting numbers</SectionLabel>
      {setupDraftStateValues(draft).map((state) => <Text key={state.key}>{state.label ?? getMovementName(state.movementId)} · {formatStateType(state.type)} · {state.value ?? 'Missing'} {draft.units}</Text>)}
      <Button label="Edit starting numbers" variant="subtle" disabled={start.pending || start.frozen} onPress={() => onEdit('numbers')} />
      {!draft.snapshot.stateValues.length ? <Text>No required starting numbers.</Text> : null}
    </Panel>
    {start.loading ? <Text>Checking your current plan and workouts…</Text> : null}
    {start.error ? <Text tone="danger">{start.error}</Text> : null}
    {review?.activeSessionId && !start.frozen ? <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
      <Text weight={800}>Finish your active workout first</Text>
      <Caption>Resume it to finish or discard it. Your setup stays here; return to review before starting the new plan.</Caption>
      <Button label="Resume workout" onPress={() => onResume(review.activeSessionId!)} />
    </Panel> : review?.pendingDecisionIds.length && !start.frozen ? <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
      <Text weight={800}>Review your pending progression first</Text>
      <Caption>Choose Apply or Keep for each change. Your new plan will wait for your final confirmation.</Caption>
      <Button label="Review progression" onPress={() => setReviewOpen(true)} />
    </Panel> : null}
    {review?.activeProgram ? <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
      <Text tone="warning">This will replace {review.activeProgram.title}.</Text>
      <Caption>Your completed workouts and saved history stay available. Replacement needs your explicit confirmation.</Caption>
    </Panel> : null}
    {review?.firstWorkout ? <SetupFirstWorkout workout={review.firstWorkout} /> : null}
    {start.frozen ? <Caption>A start request has already been sent. Retry confirms that same request; your settings stay locked until its result is known.</Caption> : null}
    {start.needsFreshReview || !start.frozen ? <Button label="Refresh review" variant="default" loading={start.loading} disabled={start.pending} onPress={start.refresh} /> : null}
    <ConfirmDialog open={start.replaceOpen} title="Replace your current plan?" confirmLabel="Replace and start plan" cancelLabel="Keep current plan"
      tone="danger" isPending={start.pending} error={start.error} onCancel={start.cancelReplace} onConfirm={start.confirmReplace}>
      <Text size="sm" tone="dimmed">{review?.activeProgram?.title} will be archived. Completed workout history remains available. Your new plan starts only after this confirmation.</Text>
    </ConfirmDialog>
    {reviewOpen && pending.isFetching ? <Text>Loading progression decisions…</Text> : null}
    {reviewOpen && pending.isError ? <><Text tone="danger">Progression review could not load.</Text><Button label="Retry progression review" onPress={() => void pending.refetch()} /></> : null}
    {reviewOpen && !pending.isFetching && !pending.isError ? <>
      {pending.data?.map((item) => <Button key={item.programId} label={`Review ${item.title} · ${item.decisions.length} changes`} variant="default" onPress={() => setSelectedGroup(item.programId)} />)}
      {!pending.data?.length ? <><Caption>These changes have already been resolved. Refresh your review to continue.</Caption><Button label="Recheck review" onPress={() => { setReviewOpen(false); start.refresh() }} /></> : null}
    </> : null}
    {group ? <ProgressionReviewSheet open decisions={group.decisions} units={group.units} user={user} contextLabel={group.title}
      onClose={() => { setSelectedGroup(null); setReviewOpen(false); start.refresh() }} /> : null}
  </>
}
