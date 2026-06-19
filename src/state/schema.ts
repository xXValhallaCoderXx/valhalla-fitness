import { z } from 'zod'
import type { AppState, LoggedAccessory, SessionLog } from './types'
import { SCHEMA_VERSION } from './types'
import {
  ACCESSORY_SLOTS,
  DEFAULT_EXERCISE_LIBRARY,
  DEFAULT_TM_PCT,
  ROUNDING_KG,
  SESSION_TEMPLATES,
  WEEKLY_SCHEDULE,
} from '@/engine/program-config'
import { nowISO, todayLocalISO } from '@/lib/date'

const liftId = z.enum(['squat', 'bench', 'deadlift'])
const sessionType = z.enum(['squat', 'bench', 'deadlift', 'assist', 'sport', 'z2', 'rest'])
const weekName = z.enum(['5s', '3s', '531', 'deload'])
const phaseId = z.union([z.literal(1), z.literal(2), z.literal(3)])
const category = z.enum([
  'quad',
  'hamstring',
  'hinge',
  'row',
  'vertical-pull',
  'press',
  'triceps',
  'biceps',
  'core',
  'prehab',
])
const fatigueCost = z.enum(['low', 'moderate', 'high'])

const tmHistory = z.object({
  date: z.string(),
  cycleIndex: z.number(),
  fromTM: z.number(),
  toTM: z.number(),
  band: z.enum(['reset', 'hold', 'standard', 'double', 'seed']),
  reason: z.string(),
})

const liftState = z.object({
  trainingMax: z.number().nullable(),
  history: z.array(tmHistory),
  consecutiveHoldOrReset: z.number(),
})

const loggedSet = z.object({
  pct: z.number(),
  prescribedWeight: z.number(),
  targetReps: z.number(),
  isTopSet: z.boolean(),
  isAmrap: z.boolean(),
  minReps: z.number().optional(),
  repsDone: z.number().optional(),
  rir: z.number().optional(),
})

const loggedAccessory = z.object({
  slotId: z.string(),
  exerciseId: z.string(),
  plannedExerciseId: z.string(),
  swappedFromId: z.string().optional(),
  weight: z.number().optional(),
  sets: z.array(z.object({ reps: z.number(), rir: z.number().optional(), done: z.boolean().optional() })),
  notes: z.string().optional(),
})

const sessionLog = z.object({
  id: z.string(),
  date: z.string(),
  cycleIndex: z.number(),
  weekIndex: z.number(),
  weekName: weekName.nullable(),
  lift: liftId.nullable(),
  sessionType,
  mainSets: z.array(loggedSet),
  fslSets: z.array(loggedSet),
  accessories: z.array(loggedAccessory),
  barSpeedFast: z.boolean(),
  benchPain: z.number().optional(),
  readinessScore: z.number().optional(),
  notes: z.string().optional(),
})

const exerciseSpec = z.object({
  id: z.string(),
  name: z.string(),
  category,
  targetMuscles: z.array(z.string()),
  equipment: z.string(),
  fatigueCost,
  painGated: z.boolean().optional(),
  note: z.string().optional(),
  custom: z.boolean().optional(),
})

const accessorySlot = z.object({
  id: z.string(),
  sessionType: z.enum(['squat', 'bench', 'deadlift', 'assist']),
  title: z.string(),
  plannedExerciseId: z.string(),
  swapPool: z.array(z.string()),
  category,
  sets: z.number(),
  repLow: z.number(),
  repHigh: z.number(),
  restSeconds: z.number(),
  painGated: z.boolean().optional(),
  fatigueSensitive: z.boolean().optional(),
  note: z.string().optional(),
})

const sessionTemplate = z.object({
  sessionType: z.enum(['squat', 'bench', 'deadlift', 'assist']),
  accessorySlotIds: z.array(z.string()),
})

export const appStateSchema = z.object({
  schemaVersion: z.number(),
  updatedAt: z.string(),
  onboarded: z.boolean(),
  config: z.object({
    units: z.literal('kg'),
    roundingKg: z.number(),
    tmPct: z.object({ squat: z.number(), bench: z.number(), deadlift: z.number() }),
    startDate: z.string(),
    phase: phaseId,
    schedule: z.record(z.string(), sessionType),
  }),
  lifts: z.object({ squat: liftState, bench: liftState, deadlift: liftState }),
  cyclePointer: z.object({ cycleIndex: z.number(), weekIndex: z.number() }),
  sessionLogs: z.array(sessionLog),
  accessoryProgress: z.record(
    z.string(),
    z.object({ exerciseId: z.string(), currentWeight: z.number(), lastUpdated: z.string() }),
  ),
  exerciseLibrary: z.record(z.string(), exerciseSpec),
  accessorySlots: z.record(z.string(), accessorySlot),
  sessionTemplates: z.object({ squat: sessionTemplate, bench: sessionTemplate, deadlift: sessionTemplate, assist: sessionTemplate }),
  restTimerSettings: z.object({
    enabled: z.boolean(),
    mainLiftSeconds: z.number(),
    accessorySeconds: z.number(),
  }),
  readinessLogs: z.array(
    z.object({
      date: z.string(),
      sleepQuality: z.number(),
      motivation: z.number(),
      soreness: z.number(),
      stress: z.number(),
      restingHrElevated: z.boolean().optional(),
      notes: z.string().optional(),
    }),
  ),
  mobility: z.object({
    log: z.record(z.string(), z.array(z.string())),
    currentStreakDays: z.number(),
    longestStreakDays: z.number(),
  }),
  metrics: z.array(
    z.object({
      date: z.string(),
      kneeToWallCm: z.number().optional(),
      frontSplitGapCmL: z.number().optional(),
      frontSplitGapCmR: z.number().optional(),
      sideSplitGapCm: z.number().optional(),
    }),
  ),
  syncMeta: z.object({
    enabled: z.boolean(),
    authenticated: z.boolean(),
    status: z.enum(['signed-out', 'ready', 'pushing', 'pulling', 'error']),
    lastPulledAt: z.string().optional(),
    lastPushedAt: z.string().optional(),
    serverUpdatedAt: z.string().optional(),
    lastError: z.string().optional(),
  }),
})

function defaultSchedule(): Record<string, AppState['config']['schedule'][string]> {
  return Object.fromEntries(Object.entries(WEEKLY_SCHEDULE).map(([day, type]) => [day, type]))
}

export function createInitialState(): AppState {
  const now = nowISO()
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: now,
    onboarded: false,
    config: {
      units: 'kg',
      roundingKg: ROUNDING_KG,
      tmPct: { ...DEFAULT_TM_PCT },
      startDate: '',
      phase: 1,
      schedule: defaultSchedule(),
    },
    lifts: {
      squat: { trainingMax: null, history: [], consecutiveHoldOrReset: 0 },
      bench: { trainingMax: null, history: [], consecutiveHoldOrReset: 0 },
      deadlift: {
        trainingMax: 190,
        history: [
          {
            date: todayLocalISO(),
            cycleIndex: 0,
            fromTM: 0,
            toTM: 190,
            band: 'seed',
            reason: 'Seeded from 210 kg tough single (1 rep, RIR 1).',
          },
        ],
        consecutiveHoldOrReset: 0,
      },
    },
    cyclePointer: { cycleIndex: 0, weekIndex: 0 },
    sessionLogs: [],
    accessoryProgress: {},
    exerciseLibrary: { ...DEFAULT_EXERCISE_LIBRARY },
    accessorySlots: { ...ACCESSORY_SLOTS },
    sessionTemplates: { ...SESSION_TEMPLATES },
    restTimerSettings: { enabled: true, mainLiftSeconds: 180, accessorySeconds: 75 },
    readinessLogs: [],
    mobility: { log: {}, currentStreakDays: 0, longestStreakDays: 0 },
    metrics: [],
    syncMeta: { enabled: false, authenticated: false, status: 'signed-out' },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function slotIdForLegacyAccessory(exerciseId: string): string {
  return (
    Object.values(ACCESSORY_SLOTS).find(
      (slot) => slot.plannedExerciseId === exerciseId || slot.swapPool.includes(exerciseId),
    )?.id ?? exerciseId
  )
}

function migrateLegacyAccessory(raw: unknown): LoggedAccessory | null {
  if (!isRecord(raw)) return null
  const legacyId = typeof raw.accessoryId === 'string' ? raw.accessoryId : undefined
  const exerciseId = typeof raw.exerciseId === 'string' ? raw.exerciseId : legacyId
  if (!exerciseId) return null
  const slotId = typeof raw.slotId === 'string' ? raw.slotId : slotIdForLegacyAccessory(exerciseId)
  const slot = ACCESSORY_SLOTS[slotId]
  const sets = Array.isArray(raw.sets)
    ? raw.sets.filter(isRecord).map((set) => ({
        reps: typeof set.reps === 'number' ? set.reps : 0,
        rir: typeof set.rir === 'number' ? set.rir : undefined,
        done: typeof set.done === 'boolean' ? set.done : true,
      }))
    : []
  return {
    slotId,
    exerciseId,
    plannedExerciseId: typeof raw.plannedExerciseId === 'string' ? raw.plannedExerciseId : slot?.plannedExerciseId ?? exerciseId,
    swappedFromId: typeof raw.swappedFromId === 'string' ? raw.swappedFromId : undefined,
    weight: typeof raw.weight === 'number' ? raw.weight : undefined,
    sets,
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
  }
}

function migrateLegacySessionLog(raw: unknown): SessionLog | null {
  if (!isRecord(raw)) return null
  const accessories = Array.isArray(raw.accessories)
    ? raw.accessories.map(migrateLegacyAccessory).filter((item): item is LoggedAccessory => Boolean(item))
    : []
  return { ...(raw as unknown as SessionLog), accessories }
}

function migrateRawState(raw: unknown): unknown {
  if (!isRecord(raw)) return raw
  const base = createInitialState()
  const config = isRecord(raw.config) ? raw.config : {}
  const sessionLogs = Array.isArray(raw.sessionLogs)
    ? raw.sessionLogs.map(migrateLegacySessionLog).filter((item): item is SessionLog => Boolean(item))
    : base.sessionLogs
  const legacyProgress = isRecord(raw.accessoryProgress) ? raw.accessoryProgress : {}
  const schedule = isRecord(config.schedule) ? { ...base.config.schedule, ...config.schedule } : base.config.schedule
  if (schedule['4'] === 'z2') schedule['4'] = 'assist'
  const accessoryProgress = Object.fromEntries(
    Object.entries(legacyProgress)
      .map(([key, value]) => {
        if (!isRecord(value)) return null
        return [
          key,
          {
            exerciseId: typeof value.exerciseId === 'string' ? value.exerciseId : typeof value.accessoryId === 'string' ? value.accessoryId : key,
            currentWeight: typeof value.currentWeight === 'number' ? value.currentWeight : 0,
            lastUpdated: typeof value.lastUpdated === 'string' ? value.lastUpdated : todayLocalISO(),
          },
        ] as const
      })
      .filter((entry): entry is readonly [string, { exerciseId: string; currentWeight: number; lastUpdated: string }] => Boolean(entry)),
  )

  return {
    ...base,
    ...raw,
    schemaVersion: SCHEMA_VERSION,
    config: {
      ...base.config,
      ...config,
      units: 'kg',
      tmPct: isRecord(config.tmPct) ? { ...base.config.tmPct, ...config.tmPct } : base.config.tmPct,
      phase: typeof config.phase === 'number' ? config.phase : base.config.phase,
      schedule,
    },
    sessionLogs,
    accessoryProgress,
    exerciseLibrary: isRecord(raw.exerciseLibrary)
      ? { ...DEFAULT_EXERCISE_LIBRARY, ...raw.exerciseLibrary }
      : base.exerciseLibrary,
    accessorySlots: isRecord(raw.accessorySlots) ? { ...ACCESSORY_SLOTS, ...raw.accessorySlots } : base.accessorySlots,
    sessionTemplates: isRecord(raw.sessionTemplates)
      ? { ...SESSION_TEMPLATES, ...raw.sessionTemplates }
      : base.sessionTemplates,
    restTimerSettings: isRecord(raw.restTimerSettings)
      ? { ...base.restTimerSettings, ...raw.restTimerSettings }
      : base.restTimerSettings,
    readinessLogs: Array.isArray(raw.readinessLogs) ? raw.readinessLogs : base.readinessLogs,
    syncMeta: isRecord(raw.syncMeta) ? { ...base.syncMeta, ...raw.syncMeta } : base.syncMeta,
  }
}

export function parseState(raw: unknown): AppState | null {
  const migrated = migrateRawState(raw)
  const res = appStateSchema.safeParse(migrated)
  if (!res.success) return null
  return res.data as AppState
}
