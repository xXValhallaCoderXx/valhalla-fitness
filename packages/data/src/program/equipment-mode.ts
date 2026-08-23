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
import {
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
  const input = previewProgramEquipmentModeInputSchema.parse(data)
  return buildPreview(ctx, input.programId, input.targetMode)
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
  const input = setProgramEquipmentModeInputSchema.parse(data)
  const preview = await buildPreview(ctx, input.programId, input.targetMode)
  // The RPC checks exact convergence before its state-version guard. Keep the
  // caller's version so a lost successful response can be replayed safely.

  let choices: FreeWeightChoiceDraft[] = []
  if (input.targetMode === 'free_weight') {
    if (
      !preview.policy ||
      input.freeWeightPolicyVersionId !== preview.policy.id ||
      input.freeWeightPolicyChecksum !== preview.policy.checksum
    ) {
      throw new Error('FREE_WEIGHT_POLICY_STALE')
    }
    choices = validateSubmittedChoices(
      preview,
      input.freeWeightChoices ?? [],
    )
  } else if (
    input.freeWeightPolicyVersionId ||
    input.freeWeightPolicyChecksum ||
    input.freeWeightChoices?.length
  ) {
    throw new Error('VALIDATION_FAILED')
  }

  const { error } = await ctx.supabase.rpc('set_program_equipment_mode_v1', {
    p_program_id: input.programId,
    p_target_mode: input.targetMode,
    p_expected_state_version: input.expectedStateVersion,
    p_free_weight_policy_version_id:
      input.targetMode === 'free_weight' ? preview.policy!.id : null,
    p_free_weight_policy_checksum:
      input.targetMode === 'free_weight' ? preview.policy!.checksum : null,
    p_free_weight_choices:
      input.targetMode === 'free_weight'
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
