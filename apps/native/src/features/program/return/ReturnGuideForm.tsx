import { View, useWindowDimensions } from 'react-native'
import { router } from 'expo-router'
import { Button, Caption, SheetModal, Text } from '@/components'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { ReturnStartStep } from './ReturnStartStep'
import { ReturnOverview } from './ReturnOverview'
import { ReturnFineTune } from './ReturnFineTune'
import { useReturnGuideDraft, type ReturnGuideState } from './useReturnGuideDraft'
import { useReturnGuideMutation } from './useReturnGuideMutation'

export function ReturnGuideForm({ state, onClose, onRefresh }: {
  state: ReturnGuideState
  onClose: () => void
  onRefresh: () => void
}) {
  const { user } = useSession()
  const { height } = useWindowDimensions()
  const draft = useReturnGuideDraft(state)
  const mutation = useReturnGuideMutation(user!, draft, onClose)
  const pending = mutation.isPending
  const blocked = pending || draft.state.hasActiveSession || (draft.editing && draft.state.pendingDecisionIds.length > 0)
  const stagesLabel = draft.raw.stages.length === 2 ? 'Your first two stages' : 'Your return stages'
  const title = draft.step === 'fineTune' ? 'Fine-tune' : draft.step === 'start' ? 'Ease back in' : draft.editing ? 'Review your return' : stagesLabel
  const eyebrow = draft.step === 'fineTune' ? 'Your return' : draft.editing ? 'Your current guide' : draft.step === 'start' ? 'Step 1 of 2 · how light to start' : 'Step 2 of 2 · what happens next'
  const saveLabel = draft.editing ? draft.program.returnPeriod?.status === 'review' ? 'Extend adjusted guide' : 'Save guide changes' : 'Start my return'
  const save = () => mutation.mutate(draft.editing ? draft.program.returnPeriod?.status === 'review' ? 'extend' : 'update' : 'apply')
  const back = () => {
    if (draft.step === 'fineTune') draft.setStep('preview')
    else if (draft.step === 'preview' && !draft.editing) draft.setStep('start')
    else onClose()
  }
  return <SheetModal open title={title} eyebrow={eyebrow} onClose={onClose} onBack={back} closeDisabled={pending} contentKey={draft.step}
    showHandle testID="return-guide-sheet" footer={<View style={{ gap: spacing.xs }}>
      {mutation.isError ? <>
        <Text size="sm" tone="danger">{mutation.error.message}</Text>
        <Caption>Your edits are kept. Retry the same change, or reload the programme to reset this preview.</Caption>
        <Button label="Reload programme and reset preview" fullWidth variant="subtle" disabled={pending} onPress={onRefresh} />
      </> : null}
      {draft.step === 'start' ? <Button label={`See ${stagesLabel.toLowerCase()}`} fullWidth onPress={() => draft.setStep('preview')} disabled={pending} /> :
        draft.step === 'fineTune' ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Button label={draft.editing ? 'Reset my edits' : 'Back to suggested'} variant="default" disabled={pending} style={{ flex: 1, minWidth: 130 }} onPress={draft.reset} />
          <Button label="Use these" disabled={pending || !draft.valid} style={{ flex: 1, minWidth: 130 }} onPress={() => draft.setStep('preview')} />
        </View> : <>
          <Button label={saveLabel} fullWidth loading={pending} disabled={blocked || !draft.valid} onPress={save} />
          {draft.editing ? <Button label={draft.program.returnPeriod?.status === 'review' ? 'Normal sets at current weights' : 'End return guide'}
            fullWidth variant="default" disabled={blocked} onPress={() => mutation.mutate('end')} /> : null}
        </>}
      <Button label={draft.step === 'start' ? 'Not now' : draft.editing && draft.step === 'preview' ? 'Cancel' : 'Back'}
        fullWidth variant="subtle" disabled={pending} onPress={back} />
    </View>}>
    <View style={{ gap: spacing.md, minHeight: draft.step === 'fineTune' ? 0 : Math.min(470, height * 0.5) }}>
      {draft.state.hasActiveSession ? <Text size="sm" tone="warning">Finish or discard your active workout before changing the guide.</Text> : null}
      {draft.step === 'start' ? <ReturnStartStep draft={draft} disabled={pending} /> : draft.step === 'preview' ?
        <ReturnOverview draft={draft} disabled={pending} /> : <ReturnFineTune draft={draft} disabled={pending} />}
      {!draft.valid ? <Text size="sm" tone="danger">Correct the values in Fine-tune to continue. A positive load that rounds to zero needs an explicit starting value.</Text> : null}
      {draft.state.pendingDecisionIds.length ? <View style={{ gap: spacing.xs }}>
        <Text size="sm" tone="warning">{draft.editing ? 'Resolve outstanding progression recommendations in Today or Plan before editing or ending the guide.' : `${draft.state.pendingDecisionIds.length} pending progression recommendations will be superseded when you start this return.`}</Text>
        {draft.state.pendingDecisions.map(decision => <Caption key={decision.id}>{decision.movementName}: {decision.recommendation}</Caption>)}
      </View> : null}
      {draft.editing && draft.step === 'preview' && !draft.state.pendingDecisionIds.length ? <Button label="Choose a replacement programme" variant="subtle"
        disabled={blocked} onPress={() => { onClose(); router.navigate('/templates') }} /> : null}
    </View>
  </SheetModal>
}
