export type Unit = 'kg' | 'lb'

export type ThemePreference = 'system' | 'dark' | 'light'

export type MovementRole = 'main' | 'variation' | 'accessory' | 'warmup' | 'event'

export type SyncState = 'synced' | 'saving' | 'offline' | 'syncFailed'

export type SwapScope = 'session' | 'phase_slot'

export type AccessoryProgressionMethod = 'history_only' | 'double_progression'

export type SessionHardness = 'Light' | 'Medium' | 'Hard' | 'Deload'

export type PrKind = 'heaviest_weight' | 'best_e1rm' | 'rep_record'

export type SessionPr = {
  movementId: string
  movementName: string
  kinds: PrKind[]
  load: number
  reps: number
  e1rm: number | null
  previousLabel: string | null
}

export type SetTarget = {
  id: string
  setIndex: number
  targetLoad?: number | null
  targetReps?: number | null
  targetRepMin?: number | null
  targetRepMax?: number | null
  targetRir?: number | null
  targetRpe?: number | null
  isTopSet?: boolean
  isAmrap?: boolean
  isBackoff?: boolean
  label?: string
}

export type SetLog = SetTarget & {
  exerciseLogId?: string
  actualLoad?: number | null
  actualReps?: number | null
  actualRir?: number | null
  actualRpe?: number | null
  completed: boolean
  note?: string | null
  clientMutationId?: string | null
  syncState?: SyncState
}

export type PreviousComparableSet = {
  setIndex: number
  load: number | null
  reps: number | null
  rir: number | null
}

export type PreviousComparable = {
  movementId: string
  label: string
  load?: number | null
  reps?: number | null
  rir?: number | null
  performedAt?: string | null
  e1rm?: number | null
  setType?: 'top_set' | 'amrap' | 'backoff' | 'best_set' | 'accessory'
  sets?: PreviousComparableSet[]
}

export type MovementSlot = {
  id: string
  slotId?: string
  phaseKey?: string
  movementId: string
  movementName: string
  performedMovementId?: string
  performedMovementName?: string
  role: MovementRole
  orderIndex: number
  targetSummary: string
  progressionRuleId?: string | null
  progressionMethod?: AccessoryProgressionMethod | null
  sets: SetLog[]
  previous?: PreviousComparable | null
  notes?: string | null
  isAdded?: boolean
  addedScope?: SwapScope
  restSeconds?: number
}

export type PlannedSession = {
  id: string
  templateSessionId?: string
  kind?: 'ad_hoc'
  title: string
  programTitle: string
  templateId: string
  weekIndex: number
  weekLabel: string
  hardness: SessionHardness | null
  scheduledDate: string
  estimatedMinutes: number
  units: Unit
  rounding: number
  movements: MovementSlot[]
}

export type WorkoutSession = PlannedSession & {
  sessionId: string
  status: 'planned' | 'in_progress' | 'completed' | 'skipped'
  startedAt?: string | null
  completedAt?: string | null
  notes?: string | null
  sessionRpe?: number | null
  reflectionWin?: string | null
  reflectionImprove?: string | null
  prs?: SessionPr[] | null
  isAdHoc?: boolean
  isFavorite?: boolean
  sourceSessionId?: string | null
  syncState?: SyncState
}
