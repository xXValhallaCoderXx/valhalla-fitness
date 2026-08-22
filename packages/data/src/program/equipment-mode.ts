import type { z } from 'zod'
import type {
  FreeWeightChoiceDraft,
  ProgramEquipmentModePreview,
} from '@sheetless/domain/program/types'
import {
  buildActiveProgramEquipmentModePreview,
  choiceMatchesPolicy,
  freeWeightChoiceKey,
  normalizeFreeWeightChoices,
} from '@sheetless/domain/program/equipment-mode'
import type {
  previewProgramEquipmentModeInputSchema,
  setProgramEquipmentModeInputSchema,
} from '@sheetless/domain/program/schemas'
import type { Json } from '@sheetless/domain/shared/types/database'
import { getMovementCatalogForSwap } from '../movement/catalog'
import { getActiveProgram } from './active-program'
import {
  getFreeWeightPolicyVersionById,
  getLatestFreeWeightPolicyVersion,
} from './template-data'
import type { UserContext } from '../shared/context'

async function buildPreview(
  ctx: UserContext,
  programId: string,
  targetMode: 'standard' | 'free_weight',
): Promise<ProgramEquipmentModePreview> {
  const { supabase } = ctx
  const program = await getActiveProgram(ctx)
  if (!program || program.id !== programId) throw new Error('PROGRAM_NOT_ACTIVE')
  const [catalog, policy] = await Promise.all([
    getMovementCatalogForSwap(supabase),
    program.freeWeightPolicyVersionId
      ? getFreeWeightPolicyVersionById(
          supabase,
          program.freeWeightPolicyVersionId,
        )
      : getLatestFreeWeightPolicyVersion(supabase),
  ])
  return buildActiveProgramEquipmentModePreview({
    program,
    targetMode,
    policy,
    catalog,
  })
}

export async function previewProgramEquipmentMode(
  ctx: UserContext,
  data: z.infer<typeof previewProgramEquipmentModeInputSchema>,
): Promise<ProgramEquipmentModePreview> {
  return buildPreview(ctx, data.programId, data.targetMode)
}

function validateSubmittedChoices(
  preview: ProgramEquipmentModePreview,
  submittedChoices: FreeWeightChoiceDraft[],
) {
  if (!preview.policy || !preview.canApply || preview.unresolved.length) {
    throw new Error('FREE_WEIGHT_UNMAPPED')
  }
  const expected = new Map(
    preview.changes.map((change) => [freeWeightChoiceKey(change), change]),
  )
  const submitted = new Map(
    submittedChoices.map((choice) => [freeWeightChoiceKey(choice), choice]),
  )
  if (
    submitted.size !== submittedChoices.length ||
    submitted.size !== expected.size
  ) {
    throw new Error('FREE_WEIGHT_CHOICE_STALE')
  }
  for (const [key, change] of expected) {
    const choice = submitted.get(key)
    if (
      !choice ||
      choice.sourceMovementId !== change.sourceMovementId ||
      !choiceMatchesPolicy(choice, preview.policy) ||
      !change.alternatives.some(
        (alternative) =>
          alternative.movementId === choice.replacementMovementId &&
          alternative.policyRuleId === choice.policyRuleId,
      )
    ) {
      throw new Error('FREE_WEIGHT_CHOICE_STALE')
    }
  }
  return normalizeFreeWeightChoices(Array.from(submitted.values()))
}

export async function setProgramEquipmentMode(
  ctx: UserContext,
  data: z.infer<typeof setProgramEquipmentModeInputSchema>,
) {
  const preview = await buildPreview(ctx, data.programId, data.targetMode)
  if (preview.expectedStateVersion !== data.expectedStateVersion) {
    throw new Error('CONFLICT')
  }

  let choices: FreeWeightChoiceDraft[] = []
  if (data.targetMode === 'free_weight') {
    if (
      !preview.policy ||
      data.freeWeightPolicyVersionId !== preview.policy.id ||
      data.freeWeightPolicyChecksum !== preview.policy.checksum
    ) {
      throw new Error('FREE_WEIGHT_POLICY_STALE')
    }
    choices = validateSubmittedChoices(
      preview,
      data.freeWeightChoices ?? [],
    )
  } else if (
    data.freeWeightPolicyVersionId ||
    data.freeWeightPolicyChecksum ||
    data.freeWeightChoices?.length
  ) {
    throw new Error('VALIDATION_FAILED')
  }

  const { error } = await ctx.supabase.rpc('set_program_equipment_mode_v1', {
    p_program_id: data.programId,
    p_target_mode: data.targetMode,
    p_expected_state_version: data.expectedStateVersion,
    p_free_weight_policy_version_id:
      data.targetMode === 'free_weight' ? preview.policy!.id : null,
    p_free_weight_policy_checksum:
      data.targetMode === 'free_weight' ? preview.policy!.checksum : null,
    p_free_weight_choices:
      data.targetMode === 'free_weight'
        ? (choices as unknown as Json)
        : null,
  })
  if (error) {
    if (error.message.includes('WORKOUT_IN_PROGRESS')) {
      throw new Error('Finish or discard the current workout first.')
    }
    if (error.message.includes('CONFLICT')) {
      throw new Error('Programme changed. Review the conversion again.')
    }
    throw new Error(error.message)
  }
  return getActiveProgram(ctx)
}
