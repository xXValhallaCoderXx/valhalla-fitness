import { z } from 'zod'
import { normalizeIanaTimeZone } from '@sheetless/domain/shared/calendar-date'
import type { FreeWeightPolicyRule } from '@sheetless/domain/program/types'

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
const policyIdentifier = z
  .string()
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

const programStateValuesSchema = z
  .array(programStateSchema)
  .max(500)
  .superRefine((values, context) => {
    const seen = new Set<string>()
    for (const [index, value] of values.entries()) {
      if (seen.has(value.key)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'key'],
          message: 'Programme state keys must be unique.',
        })
      }
      seen.add(value.key)
    }
  })

const movementOverridesSchema = z
  .array(movementOverrideSchema)
  .max(500)
  .superRefine((values, context) => {
    const seen = new Set<string>()
    for (const [index, value] of values.entries()) {
      const identity = JSON.stringify([
        value.slotId,
        value.phaseKey,
        value.role,
      ])
      if (seen.has(identity)) {
        context.addIssue({
          code: 'custom',
          path: [index],
          message: 'Movement override slot identities must be unique.',
        })
      }
      seen.add(identity)
    }
  })

const freeWeightChoicesSchema = z
  .array(freeWeightChoiceSchema)
  .max(1_000)
  .superRefine((values, context) => {
    const seen = new Set<string>()
    for (const [index, value] of values.entries()) {
      const identity = JSON.stringify([
        value.templateSessionId,
        value.slotId,
        value.phaseKey,
        value.role,
      ])
      if (seen.has(identity)) {
        context.addIssue({
          code: 'custom',
          path: [index],
          message: 'Free-weight choice slot identities must be unique.',
        })
      }
      seen.add(identity)
    }
  })

const freeWeightPolicyRuleSchema = z
  .object({
    id: policyIdentifier,
    sourceMovementId: policyIdentifier,
    replacementMovementIds: z
      .array(policyIdentifier)
      .min(1)
      .max(100)
      .superRefine((values, context) => {
        const seen = new Set<string>()
        for (const [index, value] of values.entries()) {
          if (seen.has(value)) {
            context.addIssue({
              code: 'custom',
              path: [index],
              message: 'Replacement movement identities must be unique.',
            })
          }
          seen.add(value)
        }
      }),
    loadHandling: z.literal('clear'),
  })
  .strict()
  .superRefine((rule, context) => {
    const sourceIndex = rule.replacementMovementIds.indexOf(
      rule.sourceMovementId,
    )
    if (sourceIndex >= 0) {
      context.addIssue({
        code: 'custom',
        path: ['replacementMovementIds', sourceIndex],
        message: 'A free-weight replacement must differ from its source.',
      })
    }
  })

export const freeWeightPolicyDefinitionSchema = z
  .object({
    rules: z.array(freeWeightPolicyRuleSchema).min(1).max(1_000),
  })
  .strict()
  .superRefine((definition, context) => {
    const ruleIds = new Set<string>()
    const sourceMovementIds = new Set<string>()
    for (const [index, rule] of definition.rules.entries()) {
      if (ruleIds.has(rule.id)) {
        context.addIssue({
          code: 'custom',
          path: ['rules', index, 'id'],
          message: 'Free-weight policy rule identities must be unique.',
        })
      }
      if (sourceMovementIds.has(rule.sourceMovementId)) {
        context.addIssue({
          code: 'custom',
          path: ['rules', index, 'sourceMovementId'],
          message: 'Free-weight policy source movements must be unique.',
        })
      }
      ruleIds.add(rule.id)
      sourceMovementIds.add(rule.sourceMovementId)
    }
  })

export function parseFreeWeightPolicyDefinition(
  input: unknown,
): FreeWeightPolicyRule[] {
  return freeWeightPolicyDefinitionSchema.parse(input).rules
}

export const startProgramInputSchema = z
  .object({
    requestId,
    templateId: stableIdentifier,
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
    stateValues: programStateValuesSchema.optional(),
    movementOverrides: movementOverridesSchema.optional(),
    accessoryAdditions: z.array(accessoryAdditionSchema).max(500).optional(),
    equipmentMode: z.enum(['standard', 'free_weight']).optional(),
    freeWeightPolicyVersionId: z.string().uuid().optional(),
    freeWeightPolicyChecksum: z
      .string()
      .regex(/^[0-9a-f]{32}$/)
      .optional(),
    freeWeightChoices: freeWeightChoicesSchema.optional(),
    replaceActiveProgram: z.boolean().optional(),
  })
  .strict()
  .superRefine((input, context) => {
    const equipmentMode = input.equipmentMode ?? 'standard'
    if (equipmentMode === 'free_weight') {
      if (input.freeWeightPolicyVersionId === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['freeWeightPolicyVersionId'],
          message: 'Free-weight mode requires a policy version.',
        })
      }
      if (input.freeWeightPolicyChecksum === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['freeWeightPolicyChecksum'],
          message: 'Free-weight mode requires a policy checksum.',
        })
      }
      if (input.freeWeightChoices === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['freeWeightChoices'],
          message: 'Free-weight mode requires reviewed choices.',
        })
      }
      return
    }
    if (input.freeWeightPolicyVersionId !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['freeWeightPolicyVersionId'],
        message: 'Standard mode cannot include a free-weight policy version.',
      })
    }
    if (input.freeWeightPolicyChecksum !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['freeWeightPolicyChecksum'],
        message: 'Standard mode cannot include a free-weight policy checksum.',
      })
    }
    if (input.freeWeightChoices !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['freeWeightChoices'],
        message: 'Standard mode cannot include free-weight choices.',
      })
    }
  })

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
    freeWeightChoices: freeWeightChoicesSchema.optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.targetMode === 'free_weight') {
      if (input.freeWeightPolicyVersionId === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['freeWeightPolicyVersionId'],
          message: 'Free-weight mode requires a policy version.',
        })
      }
      if (input.freeWeightPolicyChecksum === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['freeWeightPolicyChecksum'],
          message: 'Free-weight mode requires a policy checksum.',
        })
      }
      if (input.freeWeightChoices === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['freeWeightChoices'],
          message: 'Free-weight mode requires reviewed choices.',
        })
      }
      return
    }
    if (input.freeWeightPolicyVersionId !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['freeWeightPolicyVersionId'],
        message: 'Standard mode cannot include a free-weight policy version.',
      })
    }
    if (input.freeWeightPolicyChecksum !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['freeWeightPolicyChecksum'],
        message: 'Standard mode cannot include a free-weight policy checksum.',
      })
    }
    if (input.freeWeightChoices !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['freeWeightChoices'],
        message: 'Standard mode cannot include free-weight choices.',
      })
    }
  })

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
