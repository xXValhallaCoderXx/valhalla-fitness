import type { TemplateDefinition } from '~/lib/template-engine'

export type Unit = 'kg' | 'lb'

export type ThemePreference = 'system' | 'dark' | 'light'

export type MovementRole = 'main' | 'variation' | 'accessory' | 'warmup' | 'event'

export type SyncState = 'synced' | 'saving' | 'offline' | 'syncFailed'

export type SwapScope = 'session' | 'phase_slot'

export type AccessoryProgressionMethod = 'history_only' | 'double_progression'

export type SubstitutionReason = 'equipment_missing' | 'crowded_gym' | 'preference' | 'fatigue' | 'other'

export type ProgramTemplateOrigin = 'system_default' | 'coach_authored' | 'user_created'

export type ProgramCustomizationStatus = 'default' | 'customized'

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
  source: 'healthy_531' | 'bromley_base_strength' | 'linear_strength' | 'custom_import'
  sourceLabel: string
  origin: ProgramTemplateOrigin
  description: string
  daysPerWeek: number
  progressionLabel: string
  complexity: string
  tags: string[]
  requiredState: ProgramStateRequirement[]
  available: boolean
}

export type ProgramStateType = 'training_max' | 'one_rep_max' | 'working_load' | 'five_rep_max' | 'manual'

export type ProgramStateRequirement = {
  key: string
  movementId: string
  type: ProgramStateType
  label?: string
}

export type ProgramStateInput = ProgramStateRequirement & {
  value: number
  unit?: Unit
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
  customizationStatus: ProgramCustomizationStatus
  customizationSummary: ProgramCustomizationSummary
  stateValues: ProgramStateInput[]
  movementOverrides?: ProgramMovementOverride[]
  accessoryAdditions?: ProgramAccessoryAddition[]
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
  progressionRuleId?: string | null
  progressionMethod?: AccessoryProgressionMethod | null
  sets: SetLog[]
  previous?: PreviousComparable | null
  notes?: string | null
  isAdded?: boolean
  addedScope?: SwapScope
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

export type ProgramAccessoryAddition = {
  id?: string
  programInstanceId?: string
  sessionId: string
  slotId: string
  phaseKey: string
  movementId: string
  prescriptionId: string
  sourceSlotId?: string | null
  targetSummary?: string | null
  sets?: SetTarget[]
  note?: string | null
  progressionMethod?: AccessoryProgressionMethod | null
  effectiveFromWeekIndex: number
  orderIndex: number
}

export type ProgramCustomizationSummary = {
  movementOverrideCount: number
  accessoryAdditionCount: number
}

export type ProgramStartMovementOverrideInput = {
  slotId: string
  phaseKey: string
  role: Extract<MovementRole, 'variation' | 'accessory'>
  originalMovementId: string
  replacementMovementId: string
}

export type ProgramStartAccessoryAdditionInput = {
  sessionId: string
  sourceSlotId: string
  movementId: string
  phaseKey?: string
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
  source: 'rule' | 'catalog' | 'default'
  ruleId?: string
  allowedScopes: SwapScope[]
}

export type AccessoryMovementOption = {
  movementId: string
  movementName: string
  category: string
  equipment: string[]
  defaultUnit: Unit
}

export type ProgramSetupSlotOption = {
  sessionId: string
  sessionTitle: string
  slotId: string
  templateSlotId: string
  phaseKey: string
  phaseLabel: string
  role: Extract<MovementRole, 'variation' | 'accessory'>
  defaultMovementId: string
  defaultMovementName: string
  prescriptionId: string
  targetSummary: string
  replacementOptions: MovementSwapOption[]
}

export type ProgramSetupAccessoryPrescriptionOption = {
  sourceSlotId: string
  label: string
  prescriptionId: string
  targetSummary: string
}

export type ProgramSetupSessionOption = {
  id: string
  title: string
  slots: ProgramSetupSlotOption[]
  accessoryPrescriptions: ProgramSetupAccessoryPrescriptionOption[]
}

export type ProgramSetupOptions = {
  templateId: string
  templateName: string
  origin: ProgramTemplateOrigin
  sessions: ProgramSetupSessionOption[]
  accessoryCatalog: Array<{
    movementId: string
    movementName: string
    category: string
    equipment: string[]
  }>
}

export type PlannedSession = {
  id: string
  templateSessionId?: string
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
  stateKey?: string | null
  stateType?: ProgramStateType | null
  ruleId: string
  scope: 'session' | 'week' | 'wave' | 'cycle' | 'block'
  status: 'pending' | 'accepted' | 'dismissed' | 'superseded'
  inputSummary: string
  recommendation: string
  previousValue?: number | null
  recommendedValue?: number | null
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

export type ProgramStateOverview = {
  movementId: string
  movementName: string
  stateKey: string
  stateType: ProgramStateType
  label?: string | null
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
    isAdded?: boolean
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
  stateValues: ProgramStateOverview[]
  accessoryPlan: ProgramAccessoryPlan[]
  bodyLoad: BodyLoadSummary
  pendingDecisions: ProgressionDecision[]
}
