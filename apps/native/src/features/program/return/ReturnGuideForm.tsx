import { ReturnSettingsFields } from './ReturnSettingsFields'
import { useState } from 'react'
import { View } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { buildReturnOutlook } from '@sheetless/domain/program/return-outlook'
import { ReturnOverview } from './ReturnOverview'
import { ReturnReductionSlider } from './ReturnReductionSlider'
import { buildReturnPreview } from '@sheetless/domain/program/return-preview'
import {
  defaultReturnSettings,
  isReturnActive,
  returnSettingsSchema,
} from '@sheetless/domain/program/return-settings'
import {
  changeProgramReturn,
  getReturnGuide,
  returnChangeInput,
} from '@sheetless/data/program/return-guide'
import type { ReturnSettings } from '@sheetless/domain/program/types'
import { Button, Caption, SectionLabel, Text } from '@/components'
import { useSession } from '@/lib/session-provider'
import { buildUserContext } from '@/lib/account'
import { useStableMutationRequest } from '@/lib/useStableMutationRequest'
import { spacing } from '@/lib/tokens'
import { invalidateProgramStateBestEffort } from '../program-cache'
import { ReturnNumberField } from './ReturnNumberField'
import { ReturnWorkoutPreview } from './ReturnWorkoutPreview'

export function ReturnGuideForm({
  state,
  onClose,
  onRefresh,
  onSaving,
}: {
  state: Awaited<ReturnType<typeof getReturnGuide>>
  onClose: () => void
  onRefresh: () => void
  onSaving: (saving: boolean) => void
}) {
  const { user } = useSession()
  const program = state.program
  const client = useQueryClient()
  const request = useStableMutationRequest()
  const editing = isReturnActive(program.returnPeriod)
  const [reduction, setReduction] = useState(20)
  const [settings, setSettings] = useState<ReturnSettings>(
    () =>
      program.returnPeriod?.settings ??
      defaultReturnSettings(program.templateDefinition!.daysPerWeek, program.rounding),
  )
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [values, setValues] = useState<Record<string, number | null>>({})
  const settingsValid = returnSettingsSchema.safeParse(settings).success
  const preview = buildReturnPreview(program, {
    reduction: Math.max(0, Math.min(100, reduction ?? 20)) / 100,
    settings,
    values,
    scheduledDate: new Date().toISOString().slice(0, 10),
  })
  const outlook = buildReturnOutlook(program, preview, state.baseline)
  const mutation = useMutation({
    mutationFn: (action: 'apply' | 'update' | 'extend' | 'end') => {
      const intent = {
        programId: program.id,
        expectedVersion: program.stateVersion,
        action,
        settings,
        changes: action === 'end' ? [] : preview.changes,
        pendingDecisionIds: state.pendingDecisionIds,
      }
      return changeProgramReturn(
        buildUserContext(user!),
        returnChangeInput(
          state,
          action === 'end' ? program.returnPeriod!.settings : settings,
          preview.changes,
          action,
          request.requestIdFor(intent),
        ),
      )
    },
    onMutate: () => onSaving(true),
    onSettled: () => onSaving(false),
    onSuccess: async () => {
      request.clearRequest()
      await invalidateProgramStateBestEffort(client, user!.id)
      onClose()
    },
  })
  const blocked =
    mutation.isPending ||
    state.hasActiveSession ||
    !settingsValid ||
    !preview.canApply ||
    reduction < 0 ||
    reduction > 100 ||
    (editing && state.pendingDecisionIds.length > 0)
  return (
    <View style={{ gap: spacing.md }}>
      <Text>
        Choose a lighter starting point. Your programme takes care of the workout weights and
        gradual increases.
      </Text>
      {state.hasActiveSession ? (
        <Text tone="warning">Finish or discard your active workout before changing the guide.</Text>
      ) : null}
      {!editing ? (
        <ReturnReductionSlider
          value={100 - reduction}
          disabled={mutation.isPending}
          onChange={(value) => {
            setReduction(100 - value)
            setValues({})
          }}
        />
      ) : (
        <Caption>
          Your weights reflect your progress so far. Change individual values in Fine-tune.
        </Caption>
      )}
      <ReturnOverview outlook={outlook} units={program.units} />
      <Caption>
        Start with {settings.minimumRir} reps in reserve. These are editable starting suggestions,
        not estimates of lost strength.
      </Caption>
      <Button
        variant="subtle"
        label={advancedOpen ? 'Hide fine-tuning' : 'Fine-tune loads, sets and progression'}
        onPress={() => setAdvancedOpen(!advancedOpen)}
      />
      {advancedOpen || !preview.canApply ? (
        <View style={{ gap: spacing.md }}>
          {editing ? (
            <Caption>
              The original reduction is never applied again. These edits use your current weights.
            </Caption>
          ) : null}
          <SectionLabel>Programme load references · {program.units}</SectionLabel>
          <Caption>
            Historical results and account strength estimates stay separate. Enter an explicit value
            when a positive load rounds to zero.
          </Caption>
          {preview.changes.map((change) => (
            <ReturnNumberField
              key={`${change.kind}:${change.key}`}
              label={`${change.label} · ${change.before} ${program.units} →`}
              value={change.after}
              onChange={(value) =>
                setValues((current) => ({ ...current, [`${change.kind}:${change.key}`]: value }))
              }
            />
          ))}
          {!preview.changes.length ? <Caption>Choose manual loads while logging.</Caption> : null}
          <ReturnSettingsFields
            program={program}
            settings={settings}
            setSettings={setSettings}
            preview={preview}
            editing={editing}
          />
          <ReturnWorkoutPreview sessions={preview.upcoming} />
        </View>
      ) : null}
      {state.pendingDecisionIds.length ? (
        <Text tone="warning">
          {editing
            ? 'Resolve outstanding progression recommendations in Today or Plan before editing or ending the guide.'
            : `${state.pendingDecisionIds.length} pending progression recommendations will be superseded by this reset.`}
        </Text>
      ) : null}
      <Caption>
        End return guide restores ordinary sets and effort at current weights, including accepted
        increases. Review stays open after the final stage until you choose.
      </Caption>
      {state.pendingDecisions.map((decision) => (
        <Caption key={decision.id}>
          {decision.movementName}: {decision.recommendation}
        </Caption>
      ))}
      {mutation.isError ? (
        <>
          <Text tone="danger">{mutation.error.message}</Text>
          <Button label="Refresh current programme" onPress={onRefresh} />
        </>
      ) : null}
      <Button
        label={
          editing
            ? program.returnPeriod?.status === 'review'
              ? 'Extend adjusted guide'
              : 'Save guide changes'
            : 'Start my return'
        }
        disabled={blocked}
        loading={mutation.isPending}
        onPress={() =>
          mutation.mutate(
            editing ? (program.returnPeriod?.status === 'review' ? 'extend' : 'update') : 'apply',
          )
        }
      />
      {editing ? (
        <Button
          label={
            program.returnPeriod?.status === 'review'
              ? 'Normal sets at current weights'
              : 'End return guide'
          }
          variant="default"
          disabled={
            mutation.isPending || state.hasActiveSession || state.pendingDecisionIds.length > 0
          }
          onPress={() => mutation.mutate('end')}
        />
      ) : null}
      <Button label="Cancel" variant="subtle" disabled={mutation.isPending} onPress={onClose} />
      {editing && !state.pendingDecisionIds.length ? (
        <Button
          label="Choose a replacement programme"
          variant="subtle"
          onPress={() => {
            onClose()
            router.navigate('/(tabs)/templates')
          }}
        />
      ) : null}
    </View>
  )
}
