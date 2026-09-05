import { z } from 'zod'
import { parseAccessoryRepTarget } from '@sheetless/domain/session/accessories'
import { AD_HOC_TITLE_MAX_LENGTH } from '@sheetless/domain/session/ad-hoc'
import { normalizeIanaTimeZone } from '@sheetless/domain/shared/calendar-date'

const nullableFiniteNumber = z.number().finite().nullable().optional()
const requestId = z.string().trim().min(1).max(200)
const expectedStateVersion = z.number().int().nonnegative()
const nullableReflection = z.string().trim().max(2_000).nullable().optional()
const databaseId = z.string().uuid()
const stableIdentifier = z.string().trim().min(1).max(200)
const slotIdentifier = z.string().trim().min(1).max(500)
const optionalNote = z.string().trim().max(2_000).optional()
const sessionTitle = z.string().trim().min(1).max(AD_HOC_TITLE_MAX_LENGTH)
const swapScope = z.enum(['session', 'phase_slot'])
const accessoryProgressionMethod = z.enum(['history_only', 'double_progression'])
const optionalTimeZone = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine((value) => normalizeIanaTimeZone(value) !== null, 'Timezone must be a valid IANA timezone.')
  .optional()
const substitutionReason = z.enum([
  'equipment_missing',
  'crowded_gym',
  'preference',
  'fatigue',
  'other',
])
const accessoryRepTarget = z
  .string()
  .trim()
  .max(20)
  .refine((value) => parseAccessoryRepTarget(value) !== null, 'Enter a valid rep target.')

export const startSessionInputSchema = z
  .object({
    clientMutationId: requestId,
    timeZone: optionalTimeZone,
  })
  .strict()

export const startAdHocSessionInputSchema = z
  .object({
    clientMutationId: requestId,
    sourceSessionId: z.string().uuid().optional(),
    timeZone: optionalTimeZone,
  })
  .strict()

export const finishSessionInputSchema = z
  .object({
    sessionId: z.string().uuid(),
    requestId,
    notes: nullableReflection,
    sessionRpe: z.number().int().min(1).max(10).nullable().optional(),
    reflectionWin: nullableReflection,
    reflectionImprove: nullableReflection,
  })
  .strict()

export const upsertSetLogInputSchema = z
  .object({
    sessionId: databaseId,
    exerciseLogId: databaseId,
    setIndex: z.number().int().min(0).max(1_000),
    actualLoad: nullableFiniteNumber.refine(
      (value) => value == null || (value >= 0 && value <= 100_000),
      'Load must be between 0 and 100,000.',
    ),
    actualReps: z.number().int().min(0).max(1_000).nullable().optional(),
    actualRir: z.number().finite().min(0).max(10).nullable().optional(),
    actualRpe: z.number().finite().min(0).max(10).nullable().optional(),
    completed: z.boolean().optional(),
    note: z.string().trim().max(2_000).nullable().optional(),
    clientMutationId: requestId,
    expectedStateVersion,
  })
  .strict()

export const sessionIdInputSchema = z
  .object({
    sessionId: databaseId,
  })
  .strict()

export const renameSessionInputSchema = z
  .object({
    sessionId: databaseId,
    title: sessionTitle,
    requestId,
    expectedStateVersion,
  })
  .strict()

export const addSessionAccessoryInputSchema = z
  .object({
    sessionId: databaseId,
    movementId: stableIdentifier,
    progressionMethod: accessoryProgressionMethod,
    repTarget: accessoryRepTarget,
    scope: swapScope,
    note: optionalNote,
    clientMutationId: requestId,
    expectedStateVersion,
  })
  .strict()

export const reorderSessionAccessoriesInputSchema = z
  .object({
    sessionId: databaseId,
    orderedSlotIds: z.array(slotIdentifier).max(200),
    requestId,
    expectedStateVersion,
  })
  .strict()
  .superRefine(({ orderedSlotIds }, context) => {
    if (new Set(orderedSlotIds).size !== orderedSlotIds.length) {
      context.addIssue({
        code: 'custom',
        path: ['orderedSlotIds'],
        message: 'Accessory order cannot contain duplicate slots.',
      })
    }
  })

export const removeSessionAccessoryInputSchema = z
  .object({
    sessionId: databaseId,
    exerciseLogId: databaseId,
    scope: swapScope,
    requestId,
    expectedStateVersion,
  })
  .strict()

export const addAdHocExerciseInputSchema = z
  .object({
    sessionId: databaseId,
    movementId: stableIdentifier,
    clientMutationId: requestId,
    expectedStateVersion,
  })
  .strict()

export const sessionExerciseInputSchema = z
  .object({
    sessionId: databaseId,
    exerciseLogId: databaseId,
  })
  .strict()

export const removeAdHocExerciseInputSchema = z
  .object({
    sessionId: databaseId,
    exerciseLogId: databaseId,
    requestId,
    expectedStateVersion,
  })
  .strict()

export const addExerciseSetInputSchema = z
  .object({
    sessionId: databaseId,
    exerciseLogId: databaseId,
    clientMutationId: requestId,
    expectedStateVersion,
  })
  .strict()

export const substituteMovementInputSchema = z
  .object({
    sessionId: databaseId,
    exerciseLogId: databaseId,
    performedMovementId: stableIdentifier,
    reason: substitutionReason,
    note: optionalNote,
    scope: swapScope.optional(),
    requestId,
    expectedStateVersion,
  })
  .strict()

export const setSessionFavoriteInputSchema = z.discriminatedUnion('favorite', [
  z
    .object({
      sessionId: databaseId,
      favorite: z.literal(true),
      title: sessionTitle,
    })
    .strict(),
  z
    .object({
      sessionId: databaseId,
      favorite: z.literal(false),
      title: sessionTitle.optional(),
    })
    .strict(),
])

export type StartSessionInput = z.infer<typeof startSessionInputSchema>
export type StartAdHocSessionInput = z.infer<typeof startAdHocSessionInputSchema>
export type FinishSessionInput = z.infer<typeof finishSessionInputSchema>
export type UpsertSetLogInput = z.infer<typeof upsertSetLogInputSchema>
export type SessionIdInput = z.infer<typeof sessionIdInputSchema>
export type RenameSessionInput = z.infer<typeof renameSessionInputSchema>
export type AddSessionAccessoryInput = z.infer<typeof addSessionAccessoryInputSchema>
export type ReorderSessionAccessoriesInput = z.infer<typeof reorderSessionAccessoriesInputSchema>
export type RemoveSessionAccessoryInput = z.infer<typeof removeSessionAccessoryInputSchema>
export type AddAdHocExerciseInput = z.infer<typeof addAdHocExerciseInputSchema>
export type SessionExerciseInput = z.infer<typeof sessionExerciseInputSchema>
export type RemoveAdHocExerciseInput = z.infer<typeof removeAdHocExerciseInputSchema>
export type AddExerciseSetInput = z.infer<typeof addExerciseSetInputSchema>
export type SubstituteMovementInput = z.infer<typeof substituteMovementInputSchema>
export type SetSessionFavoriteInput = z.infer<typeof setSessionFavoriteInputSchema>
