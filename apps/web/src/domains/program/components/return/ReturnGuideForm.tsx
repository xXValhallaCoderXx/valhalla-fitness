import { ReturnSettingsFields } from './ReturnSettingsFields'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, NumberInput, Slider } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { buildReturnOutlook } from '@sheetless/domain/program/return-outlook'
import { ReturnOverview } from './ReturnOverview'
import { buildReturnPreview } from '@sheetless/domain/program/return-preview'
import {
  defaultReturnSettings,
  isReturnActive,
  returnSettingsSchema,
} from '@sheetless/domain/program/return-settings'
import type { ReturnSettings } from '@sheetless/domain/program/types'
import { Caption, SectionLabel, Text } from '~/components'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import { useStableMutationRequest } from '~/domains/session/lib/useStableMutationRequest'
import { accountQueryKeys } from '~/shared/lib/query-keys'
import { changeProgramReturnFn, getReturnGuideFn } from '../../server/program-return-functions'
import { ReturnWorkoutPreview } from './ReturnWorkoutPreview'

type GuideState = Awaited<ReturnType<typeof getReturnGuideFn>>
export function ReturnGuideForm({
  state,
  onClose,
  onRefresh,
}: {
  state: GuideState
  onClose: () => void
  onRefresh: () => void
}) {
  const program = state.program
  const userId = useRequiredAccountId()
  const client = useQueryClient()
  const request = useStableMutationRequest()
  const editing = isReturnActive(program.returnPeriod)
  const [reduction, setReduction] = useState(20)
  const [settings, setSettings] = useState<ReturnSettings>(
    () =>
      program.returnPeriod?.settings ??
      defaultReturnSettings(program.templateDefinition!.daysPerWeek, program.rounding),
  )
  const [values, setValues] = useState<Record<string, number | null>>({})
  const settingsValid = returnSettingsSchema.safeParse(settings).success
  const preview = buildReturnPreview(program, {
    reduction: Math.max(0, Math.min(100, Number(reduction))) / 100,
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
        settings: action === 'end' ? program.returnPeriod!.settings : settings,
        changes:
          action === 'end'
            ? []
            : preview.changes.map((change) => ({ ...change, after: change.after! })),
        pendingDecisionIds: state.pendingDecisionIds,
      }
      return changeProgramReturnFn({ data: { ...intent, requestId: request.requestIdFor(intent) } })
    },
    onSuccess: async () => {
      request.clearRequest()
      await Promise.allSettled([
        client.invalidateQueries({ queryKey: accountQueryKeys.program(userId) }),
        client.invalidateQueries({ queryKey: accountQueryKeys.today(userId) }),
      ])
      onClose()
    },
  })
  const blocked =
    mutation.isPending ||
    state.hasActiveSession ||
    !settingsValid ||
    !preview.canApply ||
    Number(reduction) < 0 ||
    Number(reduction) > 100 ||
    (editing && state.pendingDecisionIds.length > 0)
  return (
    <div className="grid gap-4">
      <Text>
        Choose a lighter starting point. Your programme takes care of the workout weights and
        gradual increases.
      </Text>
      {state.hasActiveSession ? (
        <Text tone="warning">Finish or discard your active workout before changing the guide.</Text>
      ) : null}
      {!editing ? (
        <div className="grid gap-2 pb-4">
          <Text fw={700}>Starting weight · {100 - reduction}%</Text>
          <Caption>{reduction}% lighter. Your workout weights update together.</Caption>
          <Slider
            thumbLabel="Starting weight"
            thumbValueText={(value) => `${value}% of current references`}
            value={100 - reduction}
            min={50}
            max={100}
            step={1}
            size="lg"
            thumbSize={24}
            marks={[{ value: 50 }, { value: 75 }, { value: 100 }]}
            label={null}
            disabled={mutation.isPending}
            onChange={(value) => {
              setReduction(100 - value)
              setValues({})
            }}
          />
          <div className="flex justify-between gap-2">
            <Caption>50% · lighter</Caption>
            <Caption>100% · current</Caption>
          </div>
        </div>
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
      <details open={!preview.canApply || undefined}>
        <summary>Fine-tune loads, sets and progression</summary>
        <div className="grid gap-3 mt-3">
          {editing ? (
            <Caption>
              The original reduction is never applied again. These edits use your current weights.
            </Caption>
          ) : null}
          <SectionLabel>Programme load references · {program.units}</SectionLabel>
          <Caption>
            These values belong to this programme. Historical results and account strength estimates
            stay separate. Enter an explicit value when a positive load would round to zero.
          </Caption>
          {preview.changes.map((change) => (
            <NumberInput
              key={`${change.kind}:${change.key}`}
              label={change.label}
              description={`Current ${change.before} ${program.units} → proposed`}
              value={change.after ?? ''}
              min={0}
              step={program.rounding}
              onChange={(value) =>
                setValues((current) => ({
                  ...current,
                  [`${change.kind}:${change.key}`]: typeof value === 'number' ? value : null,
                }))
              }
            />
          ))}
          {preview.changes.length === 0 ? (
            <Caption>This programme uses manually chosen loads. Choose them when logging.</Caption>
          ) : null}
          <ReturnSettingsFields
            program={program}
            settings={settings}
            setSettings={setSettings}
            preview={preview}
            editing={editing}
          />
          <ReturnWorkoutPreview sessions={preview.upcoming} />
        </div>
      </details>
      {state.pendingDecisionIds.length ? (
        <Text tone="warning">
          {editing
            ? 'Resolve outstanding progression recommendations in Today or Plan before editing or ending this guide.'
            : `${state.pendingDecisionIds.length} pending progression recommendations will be superseded by this reset.`}
        </Text>
      ) : null}
      <Caption>
        End return guide restores ordinary sets and effort at your current weights, including
        accepted increases. After the last stage, the guide stays in review until you choose.
      </Caption>
      {state.pendingDecisions.map((decision) => (
        <Caption key={decision.id}>
          {decision.movementName}: {decision.recommendation}
        </Caption>
      ))}
      {mutation.isError ? (
        <>
          <Text tone="danger">{mutation.error.message}</Text>
          <Button variant="default" onClick={onRefresh}>
            Refresh current programme
          </Button>
        </>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={blocked}
          loading={mutation.isPending}
          onClick={() =>
            mutation.mutate(
              editing ? (program.returnPeriod?.status === 'review' ? 'extend' : 'update') : 'apply',
            )
          }
        >
          {editing
            ? program.returnPeriod?.status === 'review'
              ? 'Extend adjusted guide'
              : 'Save guide changes'
            : 'Start my return'}
        </Button>
        {editing ? (
          <Button
            variant="default"
            disabled={
              mutation.isPending || state.hasActiveSession || state.pendingDecisionIds.length > 0
            }
            onClick={() => mutation.mutate('end')}
          >
            {program.returnPeriod?.status === 'review'
              ? 'Normal sets at current weights'
              : 'End return guide'}
          </Button>
        ) : null}
        <Button variant="subtle" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
      </div>
      {editing && !state.pendingDecisionIds.length ? (
        <Link to="/templates">Choose a replacement programme</Link>
      ) : null}
    </div>
  )
}
