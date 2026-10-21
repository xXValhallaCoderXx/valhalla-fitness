import { z } from 'zod'
import { startProgramInputSchema } from './schemas'
import type { ProgramSetupOptions } from './types'
import type { PlannedSession } from '../session/types'

const fields = startProgramInputSchema.shape
const id = z.string().trim().min(1).max(200)
const checksum = z.string().regex(/^[0-9a-f]{32}$/)
const unit = z.enum(['kg', 'lb'])

/** Setup review is read-only. Replacement consent belongs to the reviewed intent. */
export const programStartDraftSchema = z.object({
  templateId: fields.templateId,
  timeZone: fields.timeZone,
  title: fields.title,
  units: fields.units,
  rounding: fields.rounding,
  stateValues: fields.stateValues,
  movementOverrides: fields.movementOverrides,
  accessoryAdditions: fields.accessoryAdditions,
  equipmentMode: fields.equipmentMode,
  freeWeightPolicyVersionId: fields.freeWeightPolicyVersionId,
  freeWeightPolicyChecksum: fields.freeWeightPolicyChecksum,
  freeWeightChoices: fields.freeWeightChoices,
}).strict()

export const programStartReviewStateSchema = z.object({
  activeProgram: z.object({ id: z.uuid(), title: id, stateVersion: z.number().int().nonnegative() }).strict().nullable(),
  activeSessionId: z.uuid().nullable(),
  pendingDecisionIds: z.array(z.uuid()),
}).strict()

export const reviewedProgramStartIntentSchema = z.object({
  version: z.literal(1),
  templateId: fields.templateId,
  templateVersionId: z.uuid(),
  definitionChecksum: checksum,
  title: id,
  startDate: z.iso.date(),
  units: unit,
  rounding: z.number().finite().positive().max(1_000),
  currentBlockId: id.nullable(),
  stateValues: z.array(z.object({
    key: id, movementId: id,
    type: z.enum(['training_max', 'one_rep_max', 'working_load', 'five_rep_max', 'manual']),
    label: z.string().max(200).optional(), value: z.number().finite().positive(), unit,
  }).strict()).max(500),
  movementOverrides: z.array(z.object({
    slotId: id, phaseKey: id, role: z.enum(['variation', 'accessory']),
    originalMovementId: id, replacementMovementId: id, effectiveFromWeekIndex: z.literal(0),
  }).strict()).max(500),
  accessoryAdditions: z.array(z.object({
    sessionId: id, slotId: id, phaseKey: id, movementId: id, prescriptionId: id, sourceSlotId: id,
    effectiveFromWeekIndex: z.literal(0), orderIndex: z.number().int().positive(),
  }).strict()).max(500),
  equipmentMode: z.enum(['standard', 'free_weight']),
  freeWeightPolicyVersionId: z.uuid().nullable(),
  freeWeightPolicyChecksum: checksum.nullable(),
  freeWeightChoices: fields.freeWeightChoices.unwrap(),
  expectedActiveProgram: z.object({ id: z.uuid(), stateVersion: z.number().int().nonnegative() }).strict().nullable(),
}).strict().superRefine((intent, ctx) => {
  if (intent.stateValues.some(state => state.unit !== intent.units)
    || new Set(intent.stateValues.map(state => state.key)).size !== intent.stateValues.length) {
    ctx.addIssue({ code: 'custom', message: 'Starting state must use unique keys and the programme units.' })
  }
  if (intent.equipmentMode === 'standard'
    ? intent.freeWeightPolicyVersionId !== null || intent.freeWeightPolicyChecksum !== null || intent.freeWeightChoices.length > 0
    : intent.freeWeightPolicyVersionId === null || intent.freeWeightPolicyChecksum === null) {
    ctx.addIssue({ code: 'custom', message: 'Equipment policy must match the reviewed mode.' })
  }
})

export const startReviewedProgramInputSchema = z.object({
  requestId: fields.requestId, intent: reviewedProgramStartIntentSchema,
}).strict()

export const programStartReceiptSchema = z.object({
  requestId: fields.requestId, programId: z.uuid(), templateId: fields.templateId,
  templateVersionId: z.uuid(), startedAt: z.iso.datetime({ offset: true }),
}).strict()

export type ProgramStartDraft = z.infer<typeof programStartDraftSchema>
export type ProgramStartReviewState = z.infer<typeof programStartReviewStateSchema>
export type ReviewedProgramStartIntent = z.infer<typeof reviewedProgramStartIntentSchema>
export type ProgramStartReview = ProgramStartReviewState & {
  intent: ReviewedProgramStartIntent
  setupOptions: ProgramSetupOptions
  firstWorkout: PlannedSession
  canStart: boolean
}
export type ProgramStartReceipt = z.infer<typeof programStartReceiptSchema>
