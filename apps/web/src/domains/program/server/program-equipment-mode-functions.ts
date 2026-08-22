import { createServerFn } from '@tanstack/react-start'
import type {
  FreeWeightChoiceDraft,
  ProgramEquipmentModePreview,
} from '~/domains/program'
import {
  buildActiveProgramEquipmentModePreview,
  choiceMatchesPolicy,
  freeWeightChoiceKey,
  normalizeFreeWeightChoices,
} from '~/domains/program/lib/equipment-mode'
import {
  previewProgramEquipmentModeInputSchema,
  setProgramEquipmentModeInputSchema,
} from '~/domains/program/lib/schemas'
import {
  getMovementCatalogForSwap,
} from '@sheetless/data/movement/catalog'
import { getActiveProgramInternal } from '~/domains/program/server/active-program-functions'
import {
  getFreeWeightPolicyVersionById,
  getLatestFreeWeightPolicyVersion,
} from '~/domains/program/server/program-template-data'
import { requireProgramUser } from '~/domains/program/server/program-server'
import type { Json } from '~/shared/types/database'

async function buildPreview(
  programId: string,
  targetMode: 'standard' | 'free_weight',
): Promise<ProgramEquipmentModePreview> {
  const { supabase } = await requireProgramUser()
  const program = await getActiveProgramInternal()
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

export const previewProgramEquipmentModeFn = createServerFn({ method: 'POST' })
  .validator((data) => previewProgramEquipmentModeInputSchema.parse(data))
  .handler(({ data }) => buildPreview(data.programId, data.targetMode))

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

export const setProgramEquipmentModeFn = createServerFn({ method: 'POST' })
  .validator((data) => setProgramEquipmentModeInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase } = await requireProgramUser()
    const preview = await buildPreview(data.programId, data.targetMode)
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

    const { error } = await supabase.rpc('set_program_equipment_mode_v1', {
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
    return getActiveProgramInternal()
  })
