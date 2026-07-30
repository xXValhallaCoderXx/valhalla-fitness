import { z } from 'zod'
import { normalizeIanaTimeZone } from '~/shared/lib/calendar-date'

const requestId = z.string().trim().min(1).max(200)
const stateType = z.enum(['training_max', 'one_rep_max', 'working_load', 'five_rep_max', 'manual'])
const stableIdentifier = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/,
    'Identifier must use only letters, numbers, underscores, or hyphens.',
  )

export const programSetupOptionsInputSchema = z
  .object({
    templateId: stableIdentifier,
  })
  .strict()

const programStateSchema = z
  .object({
    key: z.string().trim().min(1).max(200),
    movementId: z.string().trim().min(1).max(200),
    type: stateType,
    label: z.string().trim().max(200).optional(),
    value: z.number().finite().nullable(),
    unit: z.enum(['kg', 'lb']).optional(),
    updatedAt: z.string().nullable().optional(),
  })
  .strict()

const movementOverrideSchema = z
  .object({
    slotId: z.string().trim().min(1).max(200),
    phaseKey: z.string().trim().min(1).max(200),
    role: z.enum(['variation', 'accessory']),
    originalMovementId: z.string().trim().min(1).max(200),
    replacementMovementId: z.string().trim().min(1).max(200),
  })
  .strict()

const accessoryAdditionSchema = z
  .object({
    sessionId: z.string().trim().min(1).max(200),
    sourceSlotId: z.string().trim().min(1).max(200),
    movementId: z.string().trim().min(1).max(200),
    phaseKey: z.string().trim().min(1).max(200).optional(),
  })
  .strict()

const freeWeightChoiceSchema = z
  .object({
    templateSessionId: z.string().trim().min(1).max(200),
    slotId: z.string().trim().min(1).max(200),
    phaseKey: z.string().trim().min(1).max(200),
    role: z.enum(['main', 'variation', 'accessory', 'warmup', 'event']),
    sourceMovementId: z.string().trim().min(1).max(200),
    replacementMovementId: z.string().trim().min(1).max(200),
    policyRuleId: z.string().trim().min(1).max(200),
  })
  .strict()

export const startProgramInputSchema = z
  .object({
    requestId,
    templateId: z.string().trim().min(1).max(200),
    timeZone: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .refine((value) => normalizeIanaTimeZone(value) !== null, 'Timezone must be a valid IANA timezone.')
      .optional(),
    title: z.string().trim().max(200).optional(),
    units: z.enum(['kg', 'lb']).optional(),
    rounding: z.number().finite().positive().max(1_000).optional(),
    stateValues: z.array(programStateSchema).max(500).optional(),
    movementOverrides: z.array(movementOverrideSchema).max(500).optional(),
    accessoryAdditions: z.array(accessoryAdditionSchema).max(500).optional(),
    equipmentMode: z.enum(['standard', 'free_weight']).optional(),
    freeWeightPolicyVersionId: z.string().uuid().optional(),
    freeWeightPolicyChecksum: z
      .string()
      .regex(/^[0-9a-f]{32}$/)
      .optional(),
    freeWeightChoices: z.array(freeWeightChoiceSchema).max(1_000).optional(),
    replaceActiveProgram: z.boolean().optional(),
  })
  .strict()

export const previewProgramEquipmentModeInputSchema = z
  .object({
    programId: z.string().uuid(),
    targetMode: z.enum(['standard', 'free_weight']),
  })
  .strict()

export const setProgramEquipmentModeInputSchema = z
  .object({
    programId: z.string().uuid(),
    targetMode: z.enum(['standard', 'free_weight']),
    expectedStateVersion: z.number().int().nonnegative(),
    freeWeightPolicyVersionId: z.string().uuid().optional(),
    freeWeightPolicyChecksum: z
      .string()
      .regex(/^[0-9a-f]{32}$/)
      .optional(),
    freeWeightChoices: z.array(freeWeightChoiceSchema).max(1_000).optional(),
  })
  .strict()

export const resolveProgressionDecisionsInputSchema = z
  .object({
    decisionIds: z
      .array(z.string().uuid())
      .min(1)
      .max(500)
      .refine((ids) => new Set(ids).size === ids.length, 'Decision IDs must be unique.'),
    action: z.enum(['accepted', 'dismissed']),
    requestId,
  })
  .strict()

export const resolveProgressionDecisionInputSchema = z
  .object({
    decisionId: z.string().uuid(),
    action: z.enum(['accepted', 'dismissed']),
    requestId,
  })
  .strict()

export type StartProgramInput = z.infer<typeof startProgramInputSchema>
export type PreviewProgramEquipmentModeInput = z.infer<
  typeof previewProgramEquipmentModeInputSchema
>
export type SetProgramEquipmentModeInput = z.infer<
  typeof setProgramEquipmentModeInputSchema
>
export type ResolveProgressionDecisionsInput = z.infer<typeof resolveProgressionDecisionsInputSchema>
