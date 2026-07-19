import { z } from 'zod'
import { movementIdsForSlot, programStateKey } from '~/domains/program/lib/template-engine'

/**
 * Zod schemas + parsing/validation for the template DSL, split from the pure engine so the
 * client (which builds timelines/previews from server-supplied definitions) never bundles zod.
 * Server code and tests import `parseTemplateDefinition` / `validateTemplateDefinition` from
 * here; everyone else imports the inferred types via `template-engine` (type-only, erased).
 */

const hardnessSchema = z.enum(['Light', 'Medium', 'Hard', 'Deload'])

const loadSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('percent_of_state'),
    stateKey: z.string().min(1).optional(),
    stateType: z.enum(['training_max', 'one_rep_max', 'working_load', 'five_rep_max', 'manual']).default('training_max'),
    percent: z.number().positive(),
    percentMax: z.number().positive().optional(),
    default: z.enum(['low', 'high', 'blank']).default('low'),
  }),
  z.object({
    kind: z.literal('state'),
    stateKey: z.string().min(1).optional(),
    stateType: z.enum(['training_max', 'one_rep_max', 'working_load', 'five_rep_max', 'manual']).default('working_load'),
  }),
  z.object({
    kind: z.literal('fixed'),
    kg: z.number().nonnegative(),
    lb: z.number().nonnegative().optional(),
  }),
  z.object({
    kind: z.literal('user_selected'),
  }),
])

const setSchema = z.object({
  targetLoad: loadSchema.optional(),
  targetReps: z.number().int().positive().optional(),
  targetRepMin: z.number().int().positive().optional(),
  targetRepMax: z.number().int().positive().optional(),
  targetRir: z.number().nonnegative().optional().nullable(),
  targetRpe: z.number().positive().optional().nullable(),
  isTopSet: z.boolean().optional(),
  isAmrap: z.boolean().optional(),
  isBackoff: z.boolean().optional(),
  label: z.string().optional(),
})

const prescriptionSchema = z.object({
  targetSummary: z.string(),
  progressionRuleId: z.string().optional(),
  sets: z.array(setSchema).min(1),
})

const movementByPhaseSchema = z.object({
  default: z.string(),
  byPhase: z.record(z.string(), z.string()).optional(),
})

const slotSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['main', 'variation', 'accessory', 'warmup', 'event']),
  movementId: z.union([z.string(), movementByPhaseSchema]),
  prescriptionId: z.string().min(1),
  anchorMovementId: z.string().optional(),
  targetSummary: z.string().optional(),
})

const sessionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  estimatedMinutes: z.number().int().positive(),
  slots: z.array(slotSchema).min(1),
})

const weekSchema = z.object({
  label: z.string().min(1),
  phaseKey: z.string().min(1),
  phaseLabel: z.string().min(1),
  waveLabel: z.string().optional(),
  focus: z.string().optional(),
  summary: z.string().min(1),
  hardness: hardnessSchema,
  prescriptions: z.record(z.string(), prescriptionSchema),
})

const requiredStateSchema = z.object({
  key: z.string().min(1),
  movementId: z.string().min(1),
  type: z.enum(['training_max', 'one_rep_max', 'working_load', 'five_rep_max', 'manual']),
  label: z.string().optional(),
})

const progressionConfigSchema = z.object({
  simple_linear_completion: z.object({
    increments: z.record(z.string(), z.object({
      kg: z.number().positive(),
      lb: z.number().positive(),
    })),
  }).optional(),
}).optional()

export const templateDefinitionSchema = z.object({
  schemaVersion: z.literal('2026.06.dsl'),
  id: z.string().min(1),
  name: z.string().min(1),
  durationWeeks: z.number().int().positive(),
  daysPerWeek: z.number().int().positive(),
  requiredState: z.array(requiredStateSchema),
  timelineDescription: z.string().min(1),
  sessions: z.array(sessionSchema).min(1),
  weeks: z.array(weekSchema).min(1),
  progressionRules: z.record(z.string(), z.string()).optional(),
  progressionConfig: progressionConfigSchema,
}).superRefine((definition, context) => {
  if (definition.sessions.length !== definition.daysPerWeek) {
    context.addIssue({
      code: 'custom',
      path: ['sessions'],
      message: 'sessions length must match daysPerWeek',
    })
  }
  if (definition.weeks.length !== definition.durationWeeks) {
    context.addIssue({
      code: 'custom',
      path: ['weeks'],
      message: 'weeks length must match durationWeeks',
    })
  }
  const stateKeys = new Set<string>()
  for (const [stateIndex, state] of definition.requiredState.entries()) {
    if (stateKeys.has(state.key)) {
      context.addIssue({
        code: 'custom',
        path: ['requiredState', stateIndex, 'key'],
        message: `${state.key} is declared more than once`,
      })
    }
    stateKeys.add(state.key)
  }
  for (const [sessionIndex, session] of definition.sessions.entries()) {
    for (const [slotIndex, slot] of session.slots.entries()) {
      for (const [weekIndex, week] of definition.weeks.entries()) {
        if (!week.prescriptions[slot.prescriptionId]) {
          context.addIssue({
            code: 'custom',
            path: ['weeks', weekIndex, 'prescriptions', slot.prescriptionId],
            message: `missing prescription for ${session.id}/${slot.id}`,
          })
        }
      }
      for (const stateKey of slotStateKeys(definition, slot)) {
        if (!stateKeys.has(stateKey)) {
          context.addIssue({
            code: 'custom',
            path: ['sessions', sessionIndex, 'slots', slotIndex, 'anchorMovementId'],
            message: `${stateKey} must be listed in requiredState because this slot references programme state`,
          })
        }
      }
    }
  }
})

export type TemplateDefinition = z.infer<typeof templateDefinitionSchema>
export type TemplateSetDefinition = TemplateDefinition['weeks'][number]['prescriptions'][string]['sets'][number]
export type TemplateValidationResult =
  | { ok: true; definition: TemplateDefinition }
  | { ok: false; message: string }

export function parseTemplateDefinition(input: unknown): TemplateDefinition {
  return templateDefinitionSchema.parse(input)
}

export function validateTemplateDefinition(input: unknown): TemplateValidationResult {
  const result = templateDefinitionSchema.safeParse(input)
  if (result.success) return { ok: true, definition: result.data }
  return { ok: false, message: z.prettifyError(result.error) }
}

function slotStateKeys(
  definition: z.infer<typeof templateDefinitionSchema>,
  slot: z.infer<typeof slotSchema>,
) {
  const stateKeys = new Set<string>()
  for (const week of definition.weeks) {
    const prescription = week.prescriptions[slot.prescriptionId]
    for (const set of prescription?.sets ?? []) {
      if (set.targetLoad?.kind === 'state' || set.targetLoad?.kind === 'percent_of_state') {
        if (set.targetLoad.stateKey) {
          stateKeys.add(set.targetLoad.stateKey)
          continue
        }
        const movementIds =
          set.targetLoad.kind === 'percent_of_state'
            ? slot.anchorMovementId
              ? [slot.anchorMovementId]
              : movementIdsForSlot(slot.movementId)
            : movementIdsForSlot(slot.movementId)
        for (const movementId of movementIds) {
          stateKeys.add(programStateKey(movementId, set.targetLoad.stateType))
        }
      }
    }
  }
  return stateKeys
}
