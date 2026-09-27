import {
  programStartDraftSchema, programStartReviewStateSchema, reviewedProgramStartIntentSchema,
  startReviewedProgramInputSchema, programStartReceiptSchema,
  type ProgramStartDraft, type ProgramStartReview, type ProgramStartReceipt, type ReviewedProgramStartIntent,
} from '@sheetless/domain/program/reviewed-start'
import type { Json } from '@sheetless/domain/shared/types/database'
import type { ProgramInstance } from '@sheetless/domain/program/types'
import { expandSessionFromTemplateDefinition } from '@sheetless/domain/program/template-engine'
import type { UserContext } from '../shared/context'
import { prepareProgramStart } from './start'

/** No writes: freeze authoritative setup plus a single account-state snapshot for review. */
export async function reviewProgramStart(ctx: UserContext, draft: ProgramStartDraft): Promise<ProgramStartReview> {
  const input = programStartDraftSchema.parse(draft)
  const { args, templateVersion, setupOptions } = await prepareProgramStart(ctx, { ...input, requestId: 'read-only-review' }, true)
  const { data, error } = await ctx.supabase.rpc('get_program_start_review_v1', { p_expected_user_id: ctx.user.id })
  if (error) throw new Error(error.message)
  const state = programStartReviewStateSchema.parse(data)
  const intent = reviewedProgramStartIntentSchema.parse({
    version: 1,
    templateId: args.p_template_id, templateVersionId: args.p_template_version_id,
    definitionChecksum: args.p_definition_checksum, title: args.p_title,
    startDate: args.p_start_date, units: args.p_units, rounding: args.p_rounding,
    currentBlockId: args.p_current_block_id,
    stateValues: (args.p_state_values as unknown as Array<Record<string, unknown>>).map(({ updatedAt: _updatedAt, ...value }) => {
      const requirement = templateVersion.definition.requiredState.find(state => state.key === value.key)
      if (!requirement || requirement.movementId !== value.movementId || requirement.type !== value.type) {
        throw new Error('PROGRAM_START_STATE_INVALID')
      }
      return { ...value, unit: value.unit ?? args.p_units }
    }),
    movementOverrides: args.p_movement_overrides, accessoryAdditions: args.p_accessory_additions,
    equipmentMode: args.p_equipment_mode, freeWeightPolicyVersionId: args.p_free_weight_policy_version_id,
    freeWeightPolicyChecksum: args.p_free_weight_policy_checksum, freeWeightChoices: args.p_free_weight_choices,
    expectedActiveProgram: state.activeProgram ? { id: state.activeProgram.id, stateVersion: state.activeProgram.stateVersion } : null,
  })
  // Mirror the initial rows persisted by start_program_v3, then use the live workout compiler.
  // The provisional ID is never returned as a saved programme or sent to a write.
  const program: ProgramInstance = {
    id: 'unsaved-setup-review', templateId: intent.templateId, templateVersionId: intent.templateVersionId,
    title: intent.title, status: 'active', startDate: intent.startDate, units: intent.units, rounding: intent.rounding,
    currentWeekIndex: 0, stateVersion: 0,
    customizationStatus: intent.movementOverrides.length || intent.accessoryAdditions.length ? 'customized' : 'default',
    customizationSummary: { movementOverrideCount: intent.movementOverrides.length, accessoryAdditionCount: intent.accessoryAdditions.length },
    stateValues: intent.stateValues, movementOverrides: intent.movementOverrides, accessoryAdditions: intent.accessoryAdditions,
    equipmentMode: intent.equipmentMode, freeWeightPolicyVersionId: intent.freeWeightPolicyVersionId,
    equipmentModeChoices: intent.freeWeightChoices,
  }
  const firstWorkout = expandSessionFromTemplateDefinition(program, templateVersion.definition, intent.startDate)
  return { ...state, intent, setupOptions, firstWorkout, canStart: !state.activeSessionId && state.pendingDecisionIds.length === 0 }
}

/** Replay goes straight to the receipt boundary, even if catalogue/profile/current plan changed. */
export async function startReviewedProgram(
  ctx: UserContext,
  input: { requestId: string; intent: ReviewedProgramStartIntent },
): Promise<ProgramStartReceipt> {
  const parsed = startReviewedProgramInputSchema.parse(input)
  const { data, error } = await ctx.supabase.rpc('start_program_v4', {
    p_request_id: parsed.requestId, p_intent: parsed.intent as unknown as Json, p_expected_user_id: ctx.user.id,
  })
  if (error) throw new Error(error.message)
  const receipt = programStartReceiptSchema.parse(data)
  if (receipt.requestId !== parsed.requestId || receipt.templateId !== parsed.intent.templateId
    || receipt.templateVersionId !== parsed.intent.templateVersionId) {
    throw new Error('The programme start receipt did not match this request. Retry to confirm the result.')
  }
  return receipt
}
