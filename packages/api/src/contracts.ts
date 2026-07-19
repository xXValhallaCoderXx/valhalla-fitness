import { z } from 'zod'
import type { WorkoutSession } from '@sheetless/core'

export const apiErrorCodes = [
  'UNAUTHENTICATED',
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'NO_PLANNED_SESSION',
  'PENDING_PROGRESSION',
  'SESSION_NOT_EDITABLE',
  'INTERNAL_ERROR',
] as const

export const apiErrorCodeSchema = z.enum(apiErrorCodes)
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    requestId: z.string(),
  }),
})

export const magicLinkIntentInputSchema = z.object({
  email: z.email(),
})

export const magicLinkIntentSchema = z.object({
  shouldSend: z.boolean(),
  shouldCreateUser: z.boolean(),
  message: z.string(),
})

export type MagicLinkIntentInput = z.infer<typeof magicLinkIntentInputSchema>
export type MagicLinkIntent = z.infer<typeof magicLinkIntentSchema>

export const nativeProfileSchema = z.object({
  id: z.uuid(),
  email: z.string().nullable(),
  displayName: z.string().nullable(),
  units: z.enum(['kg', 'lb']),
  rounding: z.number().positive(),
  themePreference: z.enum(['system', 'dark', 'light']),
  autoStartTimer: z.boolean(),
  defaultRestSeconds: z.number().int().positive(),
})

export type NativeProfile = z.infer<typeof nativeProfileSchema>

export const todaySessionCardSchema = z.object({
  sessionId: z.uuid(),
  title: z.string(),
  programTitle: z.string(),
  weekLabel: z.string(),
  completedSets: z.number().int().nonnegative(),
  totalSets: z.number().int().nonnegative(),
})

export const todayPlannedCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  programTitle: z.string(),
  weekLabel: z.string(),
  estimatedMinutes: z.number().int().nonnegative(),
  movementCount: z.number().int().nonnegative(),
  setCount: z.number().int().nonnegative(),
  units: z.enum(['kg', 'lb']),
})

export const todayCompletedCardSchema = todaySessionCardSchema.extend({
  completedAt: z.string().nullable(),
})

export const todayResponseSchema = z.object({
  activeSession: todaySessionCardSchema.nullable(),
  plannedSession: todayPlannedCardSchema.nullable(),
  completedSession: todayCompletedCardSchema.nullable(),
  hasActiveProgram: z.boolean(),
  pendingDecisionCount: z.number().int().nonnegative(),
})

export type TodayResponse = z.infer<typeof todayResponseSchema>

export const startPlannedSessionInputSchema = z.object({
  kind: z.literal('planned'),
  clientMutationId: z.uuid(),
})

export type StartPlannedSessionInput = z.infer<typeof startPlannedSessionInputSchema>

export const sessionParamsSchema = z.object({
  sessionId: z.uuid(),
})

export const setParamsSchema = sessionParamsSchema.extend({
  exerciseLogId: z.uuid(),
  setIndex: z.coerce.number().int().positive(),
})

export const updateSetLogInputSchema = z.object({
  actualLoad: z.number().finite().nonnegative().nullable().optional(),
  actualReps: z.number().int().nonnegative().nullable().optional(),
  actualRir: z.number().finite().min(0).max(10).nullable().optional(),
  actualRpe: z.number().finite().min(1).max(10).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
  completed: z.boolean(),
  clientMutationId: z.uuid(),
})

export type UpdateSetLogInput = z.infer<typeof updateSetLogInputSchema>

const nullableNumber = z.number().nullable().optional()

const setLogSchema = z.object({
  id: z.string(),
  exerciseLogId: z.string().optional(),
  setIndex: z.number().int().positive(),
  targetLoad: nullableNumber,
  targetReps: nullableNumber,
  targetRepMin: nullableNumber,
  targetRepMax: nullableNumber,
  targetRir: nullableNumber,
  targetRpe: nullableNumber,
  actualLoad: nullableNumber,
  actualReps: nullableNumber,
  actualRir: nullableNumber,
  actualRpe: nullableNumber,
  completed: z.boolean(),
  isTopSet: z.boolean().optional(),
  isAmrap: z.boolean().optional(),
  isBackoff: z.boolean().optional(),
  label: z.string().optional(),
  note: z.string().nullable().optional(),
  clientMutationId: z.string().nullable().optional(),
  syncState: z.enum(['synced', 'saving', 'offline', 'syncFailed']).optional(),
})

const previousComparableSchema = z.object({
  movementId: z.string(),
  label: z.string(),
  load: nullableNumber,
  reps: nullableNumber,
  rir: nullableNumber,
  performedAt: z.string().nullable().optional(),
  e1rm: nullableNumber,
  setType: z.enum(['top_set', 'amrap', 'backoff', 'best_set', 'accessory']).optional(),
  sets: z.array(z.object({
    setIndex: z.number().int().positive(),
    load: z.number().nullable(),
    reps: z.number().nullable(),
    rir: z.number().nullable(),
  })).optional(),
})

const movementSlotSchema = z.object({
  id: z.string(),
  slotId: z.string().optional(),
  phaseKey: z.string().optional(),
  movementId: z.string(),
  movementName: z.string(),
  performedMovementId: z.string().optional(),
  performedMovementName: z.string().optional(),
  role: z.enum(['main', 'variation', 'accessory', 'warmup', 'event']),
  orderIndex: z.number().int(),
  targetSummary: z.string(),
  progressionRuleId: z.string().nullable().optional(),
  progressionMethod: z.enum(['history_only', 'double_progression']).nullable().optional(),
  sets: z.array(setLogSchema),
  previous: previousComparableSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  isAdded: z.boolean().optional(),
  addedScope: z.enum(['session', 'phase_slot']).optional(),
  restSeconds: z.number().optional(),
})

export const workoutSessionSchema: z.ZodType<WorkoutSession> = z.object({
  id: z.string(),
  templateSessionId: z.string().optional(),
  kind: z.literal('ad_hoc').optional(),
  title: z.string(),
  programTitle: z.string(),
  templateId: z.string(),
  weekIndex: z.number().int(),
  weekLabel: z.string(),
  hardness: z.enum(['Light', 'Medium', 'Hard', 'Deload']).nullable(),
  scheduledDate: z.string(),
  estimatedMinutes: z.number(),
  units: z.enum(['kg', 'lb']),
  rounding: z.number(),
  movements: z.array(movementSlotSchema),
  sessionId: z.string(),
  status: z.enum(['planned', 'in_progress', 'completed', 'skipped']),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  sessionRpe: nullableNumber,
  reflectionWin: z.string().nullable().optional(),
  reflectionImprove: z.string().nullable().optional(),
  prs: z.array(z.object({
    movementId: z.string(),
    movementName: z.string(),
    kinds: z.array(z.enum(['heaviest_weight', 'best_e1rm', 'rep_record'])),
    load: z.number(),
    reps: z.number(),
    e1rm: z.number().nullable(),
    previousLabel: z.string().nullable(),
  })).nullable().optional(),
  isAdHoc: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  sourceSessionId: z.string().nullable().optional(),
  syncState: z.enum(['synced', 'saving', 'offline', 'syncFailed']).optional(),
})
