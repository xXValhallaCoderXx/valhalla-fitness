import type {
  AccessorySlotSpec,
  ExerciseSpec,
  SessionTemplateSpec,
} from '@/engine/program-config'
import type { LiftId, ProgressionBand, SessionType, WeekName } from '@/engine/types'

export const SCHEMA_VERSION = 2

export type PhaseId = 1 | 2 | 3

export interface AppConfig {
  units: 'kg'
  roundingKg: number
  tmPct: Record<LiftId, number>
  startDate: string
  phase: PhaseId
  schedule: Record<string, SessionType>
}

export interface TmHistoryEntry {
  date: string
  cycleIndex: number
  fromTM: number
  toTM: number
  band: ProgressionBand | 'seed'
  reason: string
}

export interface LiftState {
  trainingMax: number | null
  history: TmHistoryEntry[]
  consecutiveHoldOrReset: number
}

export interface CyclePointer {
  cycleIndex: number
  weekIndex: number
}

export interface LoggedSet {
  pct: number
  prescribedWeight: number
  targetReps: number
  isTopSet: boolean
  isAmrap: boolean
  minReps?: number
  repsDone?: number
  rir?: number
}

export interface LoggedAccessorySet {
  reps: number
  rir?: number
  done?: boolean
}

export interface LoggedAccessory {
  slotId: string
  exerciseId: string
  plannedExerciseId: string
  swappedFromId?: string
  weight?: number
  sets: LoggedAccessorySet[]
  notes?: string
}

export interface SessionLog {
  id: string
  date: string
  cycleIndex: number
  weekIndex: number
  weekName: WeekName | null
  lift: LiftId | null
  sessionType: SessionType
  mainSets: LoggedSet[]
  fslSets: LoggedSet[]
  accessories: LoggedAccessory[]
  barSpeedFast: boolean
  benchPain?: number
  readinessScore?: number
  notes?: string
}

export interface AccessoryState {
  exerciseId: string
  currentWeight: number
  lastUpdated: string
}

export interface MobilityState {
  log: Record<string, string[]>
  currentStreakDays: number
  longestStreakDays: number
}

export interface MetricEntry {
  date: string
  kneeToWallCm?: number
  frontSplitGapCmL?: number
  frontSplitGapCmR?: number
  sideSplitGapCm?: number
}

export interface ReadinessLog {
  date: string
  sleepQuality: number
  motivation: number
  soreness: number
  stress: number
  restingHrElevated?: boolean
  notes?: string
}

export interface RestTimerSettings {
  enabled: boolean
  mainLiftSeconds: number
  accessorySeconds: number
}

export type SyncStatus = 'signed-out' | 'ready' | 'pushing' | 'pulling' | 'error'

export interface SyncMeta {
  enabled: boolean
  authenticated: boolean
  status: SyncStatus
  lastPulledAt?: string
  lastPushedAt?: string
  serverUpdatedAt?: string
  lastError?: string
}

export interface AppState {
  schemaVersion: number
  updatedAt: string
  onboarded: boolean
  config: AppConfig
  lifts: Record<LiftId, LiftState>
  cyclePointer: CyclePointer
  sessionLogs: SessionLog[]
  accessoryProgress: Record<string, AccessoryState>
  exerciseLibrary: Record<string, ExerciseSpec>
  accessorySlots: Record<string, AccessorySlotSpec>
  sessionTemplates: Record<SessionTemplateSpec['sessionType'], SessionTemplateSpec>
  restTimerSettings: RestTimerSettings
  readinessLogs: ReadinessLog[]
  mobility: MobilityState
  metrics: MetricEntry[]
  syncMeta: SyncMeta
}
