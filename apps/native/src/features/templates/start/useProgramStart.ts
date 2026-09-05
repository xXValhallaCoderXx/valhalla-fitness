import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { startProgram } from '@sheetless/data/program/start'
import type { UserProfile } from '@sheetless/domain/account/types'
import type {
  FreeWeightChoiceDraft,
  FreeWeightPolicyVersion,
  ProgramEquipmentMode,
  ProgramStartAccessoryAdditionInput,
  ProgramStartMovementOverrideInput,
  ProgramStateInput,
  ProgramTemplateSummary,
} from '@sheetless/domain/program/types'
import { shouldConfirmProgramStart } from '@sheetless/domain/program/program-switch'
import {
  hasUsableStateValue,
  loadValueFromInput,
  stateValuesForProfileTemplate,
} from '@sheetless/domain/program/template-start-utils'
import { normalizeFreeWeightChoices } from '@sheetless/domain/program/equipment-mode'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { browserIanaTimeZone } from '@sheetless/domain/shared/calendar-date'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import type { TodayPayload } from '@sheetless/domain/session/types'
import { buildUserContext } from '@/lib/account'
import { useStableMutationRequest } from '@/lib/useStableMutationRequest'

type StartIntent = {
  templateId: string
  timeZone?: string
  stateValues: ProgramStateInput[]
  movementOverrides?: ProgramStartMovementOverrideInput[]
  accessoryAdditions?: ProgramStartAccessoryAdditionInput[]
  equipmentMode: ProgramEquipmentMode
  freeWeightPolicyVersionId?: string
  freeWeightPolicyChecksum?: string
  freeWeightChoices?: FreeWeightChoiceDraft[]
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

export function useProgramStart({
  user,
  profile,
  today,
  template,
  movementOverrides,
  accessoryAdditions,
  equipmentMode,
  freeWeightPolicy,
  freeWeightChoices,
  reviewNeeded,
  onStarted,
}: {
  user: User
  profile: UserProfile
  today: TodayPayload
  template: ProgramTemplateSummary
  movementOverrides: ProgramStartMovementOverrideInput[]
  accessoryAdditions: ProgramStartAccessoryAdditionInput[]
  equipmentMode: ProgramEquipmentMode
  freeWeightPolicy: FreeWeightPolicyVersion | null
  freeWeightChoices: FreeWeightChoiceDraft[]
  reviewNeeded: boolean
  onStarted: () => void
}) {
  const queryClient = useQueryClient()
  const request = useStableMutationRequest()
  const [baselineDraft] = useState(() => initialDraftValues(template, profile))
  const [draftValues, setDraftValues] = useState<Record<string, string>>(baselineDraft)
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [needsReload, setNeedsReload] = useState(false)

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
  const stateValuesDirty = JSON.stringify(draftValues) !== JSON.stringify(baselineDraft)

  const startMutation = useMutation({
    mutationFn: ({ requestId, ...intent }: StartIntent & { requestId: string }) =>
      startProgram(buildUserContext(user), { requestId, ...intent }),
    onMutate: () => {
      setStartError(null)
      setNeedsReload(false)
    },
    onError: (error) => {
      const message = getApiErrorMessage(error, 'Unable to start this programme.')
      if (/Active program in progress|ACTIVE_PROGRAM_EXISTS/i.test(message)) {
        setShowSwitchConfirm(true)
        return
      }
      if (
        /FREE_WEIGHT_(?:POLICY|CHOICE)_STALE|TEMPLATE_NOT_AVAILABLE|IDEMPOTENCY_CONFLICT|Invalid (?:customization|accessory)|Customization no longer matches|not an allowed programme replacement|Added accessories must copy/i.test(message)
      ) {
        setNeedsReload(true)
        setStartError('The programme setup changed. Reload it, then review your choices again.')
        return
      }
      if (/FREE_WEIGHT_UNMAPPED/i.test(message)) {
        setNeedsReload(true)
        setStartError('One or more movements no longer have a safe free-weight replacement.')
        return
      }
      setStartError(message)
    },
    onSuccess: async (program, variables) => {
      request.clearRequest(variables.requestId)
      setShowSwitchConfirm(false)
      if (program) queryClient.setQueryData(accountQueryKeys.activeProgram(user.id), program)
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.program(user.id) }),
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(user.id) }),
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.history(user.id) }),
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.sessions(user.id) }),
      ]
      if (today.activeSession) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: accountQueryKeys.session(user.id, today.activeSession.sessionId),
          }),
        )
      }
      await Promise.allSettled(invalidations)
      onStarted()
    },
  })

  const buildIntent = (replaceActiveProgram: boolean): StartIntent | null => {
    if (missingValues.length || startMutation.isPending || reviewNeeded || needsReload) return null
    if (equipmentMode === 'free_weight' && !freeWeightPolicy) {
      setNeedsReload(true)
      setStartError('Free-weight setup is unavailable. Reload the programme setup and try again.')
      return null
    }
    return {
      templateId: template.id,
      timeZone: browserIanaTimeZone() ?? profile.timezone ?? undefined,
      stateValues,
      movementOverrides: movementOverrides.length ? movementOverrides : undefined,
      accessoryAdditions: accessoryAdditions.length ? accessoryAdditions : undefined,
      equipmentMode,
      freeWeightPolicyVersionId:
        equipmentMode === 'free_weight' ? freeWeightPolicy!.id : undefined,
      freeWeightPolicyChecksum:
        equipmentMode === 'free_weight' ? freeWeightPolicy!.checksum : undefined,
      freeWeightChoices:
        equipmentMode === 'free_weight'
          ? normalizeFreeWeightChoices(freeWeightChoices)
          : undefined,
      replaceActiveProgram,
    }
  }

  const beginStart = (replaceActiveProgram: boolean) => {
    const intent = buildIntent(replaceActiveProgram)
    if (!intent) return
    startMutation.mutate({ ...intent, requestId: request.requestIdFor(intent) })
  }

  const requestStart = () => {
    setStartError(null)
    if (missingValues.length || reviewNeeded || needsReload) return
    if (hasActiveProgram || hasActiveSession) {
      setShowSwitchConfirm(true)
      return
    }
    beginStart(false)
  }

  return {
    draftValues,
    stateValues,
    missingValues,
    stateValuesDirty,
    showSwitchConfirm,
    startError,
    needsReload,
    isPending: startMutation.isPending,
    setDraftValue: (key: string, value: string) =>
      setDraftValues((current) => ({ ...current, [key]: value })),
    requestStart,
    closeSwitchConfirm: () => {
      if (!startMutation.isPending) setShowSwitchConfirm(false)
    },
    confirmStart: () => beginStart(true),
  }
}

export type ProgramStartController = ReturnType<typeof useProgramStart>
