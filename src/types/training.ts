import type { TemplateDefinition } from '~/lib/template-engine'

export type Unit = 'kg' | 'lb'

export type ThemePreference = 'system' | 'dark' | 'light'

export type MovementRole = 'main' | 'variation' | 'accessory' | 'warmup' | 'event'

export type SyncState = 'synced' | 'saving' | 'offline' | 'syncFailed'

export type SwapScope = 'session' | 'phase_slot'

export type SubstitutionReason = 'equipment_missing' | 'crowded_gym' | 'preference' | 'fatigue' | 'other'

export type Movement = {
  id: string
  name: string
  category: string
  equipment: string[]
  variationOf?: string | null
  defaultUnit: Unit
  isCompetition: boolean
}

export type UserProfile = {
  id: string
  email: string | null
  displayName?: string | null
  units: Unit
  rounding: number
  equipmentProfile: string[]
  themePreference: ThemePreference
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
  movementOverrides?: ProgramMovementOverride[]
  templateDefinition?: TemplateDefinition
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
  slotId?: string
  phaseKey?: string
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

export type ProgramMovementOverride = {
  id?: string
  programInstanceId?: string
  slotId: string
  phaseKey: string
  role: MovementRole
  originalMovementId: string
  replacementMovementId: string
  effectiveFromWeekIndex: number
}

export type MovementReplacementRule = {
  id: string
  sourceMovementId: string
  replacementMovementId: string
  role?: MovementRole | null
  templateId?: string | null
  phaseKey?: string | null
  slotId?: string | null
  relationshipLabel: string
  allowSessionScope: boolean
  allowPhaseSlotScope: boolean
}

export type MovementSwapOption = {
  movementId: string
  movementName: string
  category: string
  equipment: string[]
  relationshipLabel: string
  source: 'rule' | 'catalog'
  ruleId?: string
  allowedScopes: SwapScope[]
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
  e1rm?: number | null
  setType?: 'top_set' | 'amrap' | 'backoff' | 'best_set' | 'accessory'
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
  completedSession: WorkoutSession | null
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

export type RecentHistoryEntry = {
  id: string
  title: string
  completedAt?: string | null
  scheduledDate: string
  programTitle?: string | null
  weekLabel?: string | null
  hardness?: PlannedSession['hardness'] | null
  estimatedMinutes?: number | null
  movementCount: number
  completedSetCount: number
  plannedSetCount: number
}

export type MovementHistorySet = Pick<
  SetLog,
  | 'id'
  | 'setIndex'
  | 'targetLoad'
  | 'targetReps'
  | 'targetRepMin'
  | 'targetRepMax'
  | 'targetRir'
  | 'actualLoad'
  | 'actualReps'
  | 'actualRir'
  | 'completed'
  | 'isTopSet'
  | 'isAmrap'
  | 'isBackoff'
>

export type MovementHistoryEntry = {
  id: string
  sessionId: string
  sessionTitle: string
  programTitle?: string | null
  scheduledDate: string
  completedAt?: string | null
  units?: Unit | null
  plannedMovementId: string
  performedMovementId: string
  performedMovementName: string
  role: MovementRole
  targetSummary: string
  sets: MovementHistorySet[]
}

export type BodyRegionId =
  | 'chest'
  | 'shoulders'
  | 'triceps'
  | 'upper_back'
  | 'biceps'
  | 'core'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'

export type BodyLoadTier = 'fresh' | 'low' | 'moderate' | 'high'

export type BodyLoadRegion = {
  regionId: BodyRegionId
  label: string
  score: number
  impactPercent: number
  tier: BodyLoadTier
  recentSetCount: number
  lastTrainedAt?: string | null
  movementNames: string[]
}

export type BodyLoadSummary = {
  generatedAt: string
  windowDays: number
  freshRegionCount: number
  regions: BodyLoadRegion[]
  topRegions: BodyLoadRegion[]
}

export type HistoryBestSet = {
  id: string
  movementId: string
  movementName: string
  role: MovementRole
  type: 'top_set' | 'amrap' | 'accessory' | 'volume'
  load?: number | null
  reps?: number | null
  rir?: number | null
  e1rm?: number | null
  volume?: number | null
  sessionId: string
  sessionTitle: string
  performedAt?: string | null
  units?: Unit | null
}

export type HistoryMovementSummary = {
  movementId: string
  movementName: string
  category: string
  lastPerformedAt?: string | null
  totalCompletedSets: number
  totalVolume: number
  substitutionCount: number
  bestSet?: HistoryBestSet | null
}

export type HistoryWeeklyVolume = {
  weekStart: string
  weekLabel: string
  volume: number
  completedSets: number
  sessionCount: number
}

export type HistorySubstitutionSummary = {
  id: string
  sessionId: string
  sessionTitle: string
  plannedMovementId: string
  plannedMovementName: string
  performedMovementId: string
  performedMovementName: string
  reason: SubstitutionReason
  note?: string | null
  performedAt?: string | null
}

export type HistoryDashboard = {
  overview: {
    completedSessions: number
    loggedSets: number
    completedVolume: number
    uniqueMovements: number
    latestTrainingDate?: string | null
    units?: Unit | null
  }
  bodyLoad: BodyLoadSummary
  bestSets: HistoryBestSet[]
  movementSummaries: HistoryMovementSummary[]
  weeklyVolume: HistoryWeeklyVolume[]
  substitutions: HistorySubstitutionSummary[]
  recentSessions: RecentHistoryEntry[]
}

export type ProgramRecentSessionSummary = {
  id: string
  title: string
  completedAt?: string | null
  scheduledDate: string
  weekLabel?: string | null
  completedSetCount: number
  plannedSetCount: number
  topSetHighlights: string[]
}

export type ProgramAnchorOverview = {
  movementId: string
  movementName: string
  value: number
  units: Unit
  pendingDecision?: ProgressionDecision | null
  lastAcceptedDecision?: ProgressionDecision | null
}

export type ProgramAccessoryPlan = {
  sessionTitle: string
  slots: Array<{
    slotId: string
    movementId: string
    movementName: string
    role: MovementRole
    targetSummary: string
    replacedMovementName?: string | null
  }>
}

export type ProgramOverview = {
  activeProgram: ProgramInstance | null
  position: {
    phaseKey: string
    phaseLabel: string
    waveLabel?: string | null
    weekLabel: string
    weekSummary: string
    focus: string
    hardness: PlannedSession['hardness']
    weekNumber: number
    totalWeeks: number
    sessionNumber: number
    daysPerWeek: number
    progressPercent: number
  } | null
  nextSession: {
    title: string
    scheduledDate: string
    mainMovementName: string
    keyPrescription: string
    variationCount: number
    accessoryCount: number
    status: 'planned' | 'in_progress' | 'completed'
    href: string
  } | null
  recentSessions: ProgramRecentSessionSummary[]
  anchors: ProgramAnchorOverview[]
  accessoryPlan: ProgramAccessoryPlan[]
  bodyLoad: BodyLoadSummary
  pendingDecisions: ProgressionDecision[]
}
