import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import {
  previewProgramEquipmentMode,
  setProgramEquipmentMode,
} from '@sheetless/data/program/equipment-mode'
import type {
  FreeWeightChoiceDraft,
  ProgramEquipmentMode,
  ProgramEquipmentModePreview,
  ProgramInstance,
} from '@sheetless/domain/program/types'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { buildUserContext } from '@/lib/account'
import type {
  EquipmentModeReviewRow,
  EquipmentModeUnresolvedRow,
} from './EquipmentModeReviewSheet'
import {
  invalidateProgramStateBestEffort,
  seedActiveProgram,
} from '../program-cache'

type PreviewRequest = {
  targetMode: ProgramEquipmentMode
  refreshed?: boolean
}

type SetModeInput = Parameters<typeof setProgramEquipmentMode>[1]

export function useProgramEquipmentMode({
  user,
  program,
  hasActiveSession,
}: {
  user: User
  program: ProgramInstance
  hasActiveSession: boolean
}) {
  const queryClient = useQueryClient()
  const [preview, setPreview] = useState<ProgramEquipmentModePreview | null>(null)
  const [choices, setChoices] = useState<FreeWeightChoiceDraft[]>([])
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const currentMode = program.equipmentMode ?? 'standard'
  const targetMode: ProgramEquipmentMode = currentMode === 'free_weight' ? 'standard' : 'free_weight'

  const previewMutation = useMutation({
    mutationFn: ({ targetMode: requestedMode }: PreviewRequest) =>
      previewProgramEquipmentMode(buildUserContext(user), {
        programId: program.id,
        targetMode: requestedMode,
      }),
    onMutate: ({ refreshed }) => {
      setPreviewError(null)
      setSuccessMessage(null)
      if (refreshed) setApplyError('Programme changed. Refreshing the review…')
      else setApplyError(null)
    },
    onSuccess: (nextPreview, request) => {
      if (nextPreview.currentMode === request.targetMode) {
        setPreview(null)
        setChoices([])
        setApplyError(null)
        setSuccessMessage('The equipment change was already saved.')
        void invalidateProgramStateBestEffort(queryClient, user.id)
        return
      }

      setChoices((current) => reconcileChoices(nextPreview, current))
      setPreview(nextPreview)
      setApplyError(request.refreshed
        ? 'Programme changes were detected. Review the refreshed replacements before applying.'
        : null)
    },
    onError: (error, request) => {
      const message = equipmentModeErrorMessage(
        error,
        'Unable to build the equipment conversion review.',
      )
      if (request.refreshed) {
        setPreview(null)
        setChoices([])
        setApplyError(null)
      }
      setPreviewError(message)
    },
  })

  const applyMutation = useMutation({
    mutationFn: (input: SetModeInput) =>
      setProgramEquipmentMode(buildUserContext(user), input),
    onMutate: () => {
      setApplyError(null)
      setSuccessMessage(null)
    },
    onSuccess: async (updatedProgram) => {
      if (updatedProgram) seedActiveProgram(queryClient, user.id, updatedProgram)
      setPreview(null)
      setChoices([])
      setApplyError(null)
      setSuccessMessage(
        !updatedProgram
          ? 'Equipment mode updated.'
          : updatedProgram.equipmentMode === 'free_weight'
          ? 'Free weights only is on for future programme workouts.'
          : 'All equipment is on for future programme workouts.',
      )
      await invalidateProgramStateBestEffort(queryClient, user.id)
    },
    onError: (error, input) => {
      if (equipmentReviewMustRefresh(error)) {
        void invalidateProgramStateBestEffort(queryClient, user.id)
        previewMutation.mutate({ targetMode: input.targetMode, refreshed: true })
        return
      }

      const message = equipmentModeErrorMessage(
        error,
        'Unable to update this programme right now.',
      )
      setApplyError(message)
      if (equipmentStateMustInvalidate(error)) {
        void invalidateProgramStateBestEffort(queryClient, user.id)
      }
    },
  })

  const requestReview = () => {
    if (hasActiveSession || previewMutation.isPending || applyMutation.isPending) return
    previewMutation.reset()
    applyMutation.reset()
    setPreview(null)
    setChoices([])
    previewMutation.mutate({ targetMode })
  }

  const closeReview = () => {
    if (previewMutation.isPending || applyMutation.isPending) return
    setPreview(null)
    setChoices([])
    setApplyError(null)
    applyMutation.reset()
  }

  const updateChoice = (
    original: FreeWeightChoiceDraft,
    replacementMovementId: string,
  ) => {
    setChoices((current) => current.map((choice) =>
      sameChoice(choice, original)
        ? { ...choice, replacementMovementId }
        : choice,
    ))
    setApplyError(null)
    applyMutation.reset()
  }

  const apply = () => {
    if (!preview || !preview.canApply || hasActiveSession || applyMutation.isPending) return
    const input: SetModeInput = {
      programId: program.id,
      targetMode: preview.targetMode,
      expectedStateVersion: preview.expectedStateVersion,
      freeWeightPolicyVersionId:
        preview.targetMode === 'free_weight' ? preview.policy?.id : undefined,
      freeWeightPolicyChecksum:
        preview.targetMode === 'free_weight' ? preview.policy?.checksum : undefined,
      freeWeightChoices:
        preview.targetMode === 'free_weight' ? [...choices] : undefined,
    }
    applyMutation.mutate(input)
  }

  const reviewRows: EquipmentModeReviewRow[] = preview?.changes.map((change) => ({
    choice: toChoice(change),
    sessionTitle: change.sessionTitle,
    phaseLabel: change.phaseLabel,
    sourceMovementName: change.sourceMovementName,
    replacementMovementName: change.replacementMovementName,
    alternatives: change.alternatives,
  })) ?? []
  const unresolved: EquipmentModeUnresolvedRow[] = preview?.unresolved.map((item) => ({
    sourceMovementName: item.sourceMovementName,
    sessionTitle: program.templateDefinition?.sessions.find(
      (session) => session.id === item.templateSessionId,
    )?.title,
    phaseLabel: program.templateDefinition?.weeks.find(
      (week) => week.phaseKey === item.phaseKey,
    )?.phaseLabel,
  })) ?? []

  return {
    currentMode,
    targetMode,
    choices,
    preview,
    reviewRows,
    unresolved,
    previewError,
    applyError,
    successMessage,
    isPreviewing: previewMutation.isPending,
    isApplying: applyMutation.isPending,
    requestReview,
    closeReview,
    updateChoice,
    apply,
  }
}

function reconcileChoices(
  preview: ProgramEquipmentModePreview,
  current: FreeWeightChoiceDraft[],
) {
  return preview.changes.map((change) => {
    const fallback = toChoice(change)
    const previous = current.find((choice) => sameChoice(choice, fallback))
    const alternative = previous && change.alternatives.find(
      (candidate) => candidate.movementId === previous.replacementMovementId,
    )
    return alternative
      ? {
          ...fallback,
          replacementMovementId: alternative.movementId,
          policyRuleId: alternative.policyRuleId,
        }
      : fallback
  })
}

function toChoice(
  change: ProgramEquipmentModePreview['changes'][number],
): FreeWeightChoiceDraft {
  return {
    templateSessionId: change.templateSessionId,
    slotId: change.slotId,
    phaseKey: change.phaseKey,
    role: change.role,
    sourceMovementId: change.sourceMovementId,
    replacementMovementId: change.replacementMovementId,
    policyRuleId: change.policyRuleId,
  }
}

function sameChoice(left: FreeWeightChoiceDraft, right: FreeWeightChoiceDraft) {
  return left.templateSessionId === right.templateSessionId
    && left.slotId === right.slotId
    && left.phaseKey === right.phaseKey
    && left.role === right.role
}

function equipmentReviewMustRefresh(error: unknown) {
  const message = getApiErrorMessage(error, '')
  return /\bCONFLICT\b|Programme changed|FREE_WEIGHT_(?:POLICY|CHOICE)_STALE|FREE_WEIGHT_UNMAPPED/i.test(message)
}

function equipmentStateMustInvalidate(error: unknown) {
  const message = getApiErrorMessage(error, '')
  return /PROGRAM_NOT_ACTIVE|WORKOUT_IN_PROGRESS|workout first/i.test(message)
}

function equipmentModeErrorMessage(error: unknown, fallback: string) {
  const message = getApiErrorMessage(error, fallback)
  if (/PROGRAM_NOT_ACTIVE/i.test(message)) return 'This programme is no longer active.'
  if (/WORKOUT_IN_PROGRESS|workout first/i.test(message)) {
    return 'Finish or discard the current workout before changing equipment mode.'
  }
  if (/FREE_WEIGHT_UNMAPPED/i.test(message)) {
    return 'One or more movements do not have a safe free-weight replacement.'
  }
  if (/FREE_WEIGHT_(?:POLICY|CHOICE)_STALE/i.test(message)) {
    return 'The replacement policy changed. Review the refreshed choices.'
  }
  if (/\bCONFLICT\b|Programme changed/i.test(message)) {
    return 'The programme changed. Review the refreshed choices.'
  }
  return message
}
