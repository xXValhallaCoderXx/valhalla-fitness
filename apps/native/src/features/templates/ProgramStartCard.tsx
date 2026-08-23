import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import type { User } from '@supabase/supabase-js'
import { startProgram } from '@sheetless/data/program/start'
import type { UserProfile } from '@sheetless/domain/account/types'
import type { ProgramStateInput, ProgramTemplateSummary } from '@sheetless/domain/program/types'
import { shouldConfirmProgramStart } from '@sheetless/domain/program/program-switch'
import {
  hasUsableStateValue,
  loadValueFromInput,
  stateValuesForProfileTemplate,
} from '@sheetless/domain/program/template-start-utils'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { browserIanaTimeZone } from '@sheetless/domain/shared/calendar-date'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import type { TodayPayload } from '@sheetless/domain/session/types'
import {
  Badge,
  Button,
  Caption,
  ConfirmDialog,
  Panel,
  SectionLabel,
  Text,
} from '@/components'
import { buildUserContext } from '@/lib/account'
import { spacing, useTokens } from '@/lib/tokens'
import { useStableMutationRequest } from '@/lib/useStableMutationRequest'
import { ProgramStartValues } from './ProgramStartValues'

type StartIntent = {
  templateId: string
  timeZone?: string
  stateValues: ProgramStateInput[]
  equipmentMode: 'standard'
  replaceActiveProgram: boolean
}

function initialDraftValues(template: ProgramTemplateSummary, profile: UserProfile) {
  return Object.fromEntries(
    stateValuesForProfileTemplate(template, profile).map((state) => [
      state.key,
      hasUsableStateValue(state.value) ? String(state.value) : '',
    ]),
  )
}

export function ProgramStartCard({
  user,
  profile,
  today,
  template,
}: {
  user: User
  profile: UserProfile
  today: TodayPayload
  template: ProgramTemplateSummary
}) {
  const { theme } = useTokens()
  const queryClient = useQueryClient()
  const request = useStableMutationRequest()
  const [draftValues, setDraftValues] = useState<Record<string, string>>(() =>
    initialDraftValues(template, profile),
  )
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  const stateValues = useMemo(
    () =>
      stateValuesForProfileTemplate(template, profile).map((state) => ({
        ...state,
        value: loadValueFromInput(draftValues[state.key] ?? ''),
      })),
    [draftValues, profile, template],
  )
  const missingValues = stateValues.filter((state) => !hasUsableStateValue(state.value))
  const hasActiveProgram = shouldConfirmProgramStart(today)
  const hasActiveSession = Boolean(today.activeSession)

  const startMutation = useMutation({
    mutationFn: ({ requestId, ...intent }: StartIntent & { requestId: string }) =>
      startProgram(buildUserContext(user), { requestId, ...intent }),
    onMutate: () => setStartError(null),
    onError: (error) => {
      if (error instanceof Error && error.message === 'Active program in progress') {
        setShowSwitchConfirm(true)
        return
      }
      setStartError(getApiErrorMessage(error, 'Unable to start this programme.'))
    },
    onSuccess: async (program, variables) => {
      request.clearRequest(variables.requestId)
      setShowSwitchConfirm(false)
      queryClient.setQueryData(accountQueryKeys.activeProgram(user.id), program)
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.program(user.id) }),
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(user.id) }),
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.history(user.id) }),
      ]
      if (today.activeSession) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: accountQueryKeys.session(user.id, today.activeSession.sessionId),
          }),
        )
      }
      await Promise.all(invalidations)
      router.dismissTo('/(tabs)')
    },
  })

  const beginStart = (replaceActiveProgram: boolean) => {
    if (missingValues.length || startMutation.isPending) return
    const intent: StartIntent = {
      templateId: template.id,
      timeZone: browserIanaTimeZone() ?? profile.timezone ?? undefined,
      stateValues,
      equipmentMode: 'standard',
      replaceActiveProgram,
    }
    startMutation.mutate({ ...intent, requestId: request.requestIdFor(intent) })
  }

  const requestStart = () => {
    setStartError(null)
    if (missingValues.length) return
    if (hasActiveProgram || hasActiveSession) {
      setShowSwitchConfirm(true)
      return
    }
    beginStart(false)
  }

  return (
    <>
      <Panel style={{ borderColor: theme.tones.action.border, gap: spacing.md, padding: spacing.md }}>
        <View style={{ gap: 4 }}>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.xs,
              justifyContent: 'space-between',
            }}
          >
            <SectionLabel tone="action">Programme setup</SectionLabel>
            <Badge tone={missingValues.length ? 'warning' : 'success'}>
              {stateValues.length
                ? missingValues.length
                  ? `${missingValues.length} missing`
                  : `${stateValues.length} ready`
                : 'Ready'}
            </Badge>
          </View>
          <Text size="sm" weight={800}>
            {profile.units} · round to {profile.rounding}
          </Text>
          <Caption>
            Starting values are copied into this programme only. You can adjust them without changing
            your saved profile estimates.
          </Caption>
        </View>

        <ProgramStartValues
          profile={profile}
          stateValues={stateValues}
          draftValues={draftValues}
          disabled={startMutation.isPending}
          onChange={(key, value) =>
            setDraftValues((current) => ({ ...current, [key]: value }))
          }
        />

        {today.activeProgram ? (
          <Text size="sm" tone="warning">
            Starting this will replace {today.activeProgram.title} after confirmation.
          </Text>
        ) : null}
        {startError ? (
          <Text size="sm" tone="danger">
            {startError}
          </Text>
        ) : null}
        <Button
          label="Start programme"
          fullWidth
          loading={startMutation.isPending}
          disabled={missingValues.length > 0}
          onPress={requestStart}
          testID="program-start"
        />
      </Panel>

      <ConfirmDialog
        open={showSwitchConfirm}
        title="Replace current training?"
        confirmLabel="Replace and start"
        cancelLabel="Keep current training"
        tone="danger"
        isPending={startMutation.isPending}
        error={startError}
        onCancel={() => {
          if (!startMutation.isPending) setShowSwitchConfirm(false)
        }}
        onConfirm={() => beginStart(true)}
      >
        <View style={{ gap: spacing.xs }}>
          <Text size="sm">
            Any active programme will be archived and {template.name} will become active.
          </Text>
          <Text size="sm" tone="warning">
            Any workout currently in progress and every set logged in it will be discarded. Completed
            workout history is unaffected.
          </Text>
        </View>
      </ConfirmDialog>
    </>
  )
}
