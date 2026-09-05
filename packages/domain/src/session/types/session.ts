import type { SwapScope } from '@sheetless/domain/movement/types'
import type { ReturnSessionContext, ReturnStateBinding, TemplateSetDefinition } from '../../program/types'
import type { AccessoryProgressionMethod } from '@sheetless/domain/program/types'
import type {
  EquipmentModeAdaptation,
  ProgramEquipmentMode,
} from '@sheetless/domain/program/types'
import type { MovementRole, SessionHardness, Unit } from '@sheetless/domain/shared/types'

export type SyncState = 'synced' | 'saving' | 'syncFailed'

export type SubstitutionReason = 'equipment_missing' | 'crowded_gym' | 'preference' | 'fatigue' | 'other'

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
  /** Immutable DSL source, used to preserve distinct ramps before rounding. */
  sourcePrescription?: TemplateSetDefinition
  sourceBinding?: ReturnStateBinding | null
}

export type SetLog = SetTarget & {
  exerciseLogId?: string
  /** External resistance: positive = weighted, 0 = explicitly bodyweight/loadless, null = unset or legacy loadless. */
  actualLoad?: number | null
  actualReps?: number | null
  actualRir?: number | null
  actualRpe?: number | null
  completed: boolean
  note?: string | null
  clientMutationId?: string | null
  syncState?: SyncState
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
  /** Provenance for an automatic programme equipment-mode replacement. */
  modeAdaptation?: EquipmentModeAdaptation
  /** Optional per-slot rest override (seconds); rides the session snapshot, no DB column. */
  restSeconds?: number
  /** During/after a reset, old comparables remain visible but cannot seed inputs. */
  loadSuggestionCutoff?: string
}

export type PlannedSession = {
  id: string
  templateSessionId?: string
  /** Present (as 'ad_hoc') on snapshots of plan-less one-off sessions. */
  kind?: 'ad_hoc'
  title: string
  programTitle: string
  templateId: string
  /** Programme equipment policy frozen when the workout snapshot is created. */
  equipmentMode?: ProgramEquipmentMode
  freeWeightPolicyVersionId?: string | null
  weekIndex: number
  weekLabel: string
  phaseLabel?: string
  /** null for ad-hoc sessions — they have no prescribed intensity. */
  hardness: SessionHardness | null
  scheduledDate: string
  /** Account IANA timezone used to derive the scheduled workout date. */
  timeZone?: string | null
  estimatedMinutes: number
  units: Unit
  rounding: number
  returnContext?: ReturnSessionContext
  loadOverrideVersion?: 1
  movements: MovementSlot[]
}

export type WorkoutSession = PlannedSession & {
  sessionId: string
  /** Monotonic content revision used by atomic workout mutations. */
  stateVersion: number
  status: 'planned' | 'in_progress' | 'completed' | 'skipped'
  startedAt?: string | null
  completedAt?: string | null
  notes?: string | null
  /** One-tap "How hard was that?" rating captured at finish, 1 (easy) to 10 (max effort). */
  sessionRpe?: number | null
  /** Optional finish-time reflection: one thing that went well. */
  reflectionWin?: string | null
  /** Optional finish-time reflection: one thing to work on. */
  reflectionImprove?: string | null
  /** Personal records broken in this session, frozen at finish time. */
  prs?: SessionPr[] | null
  returnRecommendations?: Array<{ movementId: string; recommendation: string; previousValue?: number | null; recommendedValue?: number | null }>
  isAdHoc?: boolean
  /** Favourite state of the whole workout lineage (the session or the workout it repeats). */
  isFavorite?: boolean
  /** Root session this one was repeated from; null for originals. */
  sourceSessionId?: string | null
  syncState?: SyncState
}

export type PrKind = 'heaviest_weight' | 'best_e1rm' | 'rep_record'

/** A personal record broken in a session — computed and frozen at finish time. */
export type SessionPr = {
  movementId: string
  movementName: string
  /** Records broken by this movement's headline set, ordered most impressive first. */
  kinds: PrKind[]
  load: number
  reps: number
  e1rm: number | null
  /** Beginner-readable "what you beat", e.g. "Old best: 80 kg × 5". */
  previousLabel: string | null
}

/** A comparable session's actual result for one set position, used for per-row previous ghosts. */
export type PreviousComparableSet = {
  setIndex: number
  /** Derived external resistance; null means bodyweight/loadless. */
  load: number | null
  reps: number | null
  rir: number | null
}

export type PreviousComparable = {
  /** Exact-slot performed inputs since the accepted reset, separate from older history. */
  postResetSets?: PreviousComparableSet[]
  movementId: string
  label: string
  /** Derived external resistance; null/zero is displayed and ranked as bodyweight. */
  load?: number | null
  reps?: number | null
  rir?: number | null
  /** Canonical scheduled workout date for calendar display and comparable recency. */
  workoutDate?: string | null
  /** IANA timezone captured with the workout snapshot; absent on legacy comparables. */
  timeZone?: string | null
  /** Completion timestamp retained as a legacy fallback and operational detail. */
  performedAt?: string | null
  e1rm?: number | null
  setType?: 'top_set' | 'amrap' | 'backoff' | 'best_set' | 'accessory'
  /** Completed sets from the comparable session; absent on snapshots created before this shipped. */
  sets?: PreviousComparableSet[]
}
