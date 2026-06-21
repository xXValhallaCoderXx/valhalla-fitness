export type Unit = 'kg' | 'lb'

export type MovementRole = 'main' | 'variation' | 'accessory' | 'warmup' | 'event'

export type SyncState = 'synced' | 'saving' | 'offline' | 'syncFailed'

export type Movement = {
  id: string
  name: string
  category: string
  equipment: string[]
  variationOf?: string | null
  defaultUnit: Unit
  isCompetition: boolean
}

export type ProgramTemplateSummary = {
  id: string
  name: string
  source: 'healthy_531' | 'bromley_base_strength' | 'custom_import'
  sourceLabel: string
  description: string
  daysPerWeek: number
  progressionLabel: string
  complexity: string
  tags: string[]
  available: boolean
}

export type AnchorInput = {
  movementId: string
  anchorType: 'training_max' | 'one_rep_max' | 'manual'
  value: number
}

export type ProgramInstance = {
  id: string
  templateId: string
  templateVersionId: string
  title: string
  status: 'active' | 'paused' | 'completed' | 'archived'
  startDate: string
  units: Unit
  rounding: number
  currentWeekIndex: number
  anchors: AnchorInput[]
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

export type MovementSlot = {
  id: string
  movementId: string
  movementName: string
  performedMovementId?: string
  performedMovementName?: string
  role: MovementRole
  orderIndex: number
  targetSummary: string
  sets: SetLog[]
  previous?: PreviousComparable | null
  notes?: string | null
}

export type PlannedSession = {
  id: string
  title: string
  programTitle: string
  templateId: string
  weekIndex: number
  weekLabel: string
  hardness: 'Light' | 'Medium' | 'Hard' | 'Deload'
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
  syncState?: SyncState
}

export type PreviousComparable = {
  movementId: string
  label: string
  load?: number | null
  reps?: number | null
  rir?: number | null
  performedAt?: string | null
}

export type ProgressionDecision = {
  id: string
  movementId: string
  movementName: string
  ruleId: string
  scope: 'session' | 'week' | 'wave' | 'cycle' | 'block'
  status: 'pending' | 'accepted' | 'dismissed' | 'superseded'
  inputSummary: string
  recommendation: string
  previousAnchor?: number | null
  recommendedAnchor?: number | null
}

export type TodayPayload = {
  activeProgram: ProgramInstance | null
  plannedSession: PlannedSession | null
  activeSession: WorkoutSession | null
  pendingDecisions: ProgressionDecision[]
}

export type SessionSummary = {
  session: WorkoutSession
  completedSets: number
  totalSets: number
  topSets: SetLog[]
  accessoryOutcomes: string[]
  decisions: ProgressionDecision[]
}
