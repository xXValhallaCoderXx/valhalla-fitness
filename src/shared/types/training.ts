import type { TemplateDefinition } from '~/domains/program/lib/template-engine'

export type Unit = 'kg' | 'lb'

export type ThemePreference = 'system' | 'dark' | 'light'

export type MovementRole = 'main' | 'variation' | 'accessory' | 'warmup' | 'event'

export type SyncState = 'synced' | 'saving' | 'offline' | 'syncFailed'

export type SwapScope = 'session' | 'phase_slot'

export type AccessoryProgressionMethod = 'history_only' | 'double_progression'

export type SubstitutionReason = 'equipment_missing' | 'crowded_gym' | 'preference' | 'fatigue' | 'other'

export type ProgramTemplateOrigin = 'system_default' | 'licensed_partner' | 'user_created'

export type ProgramCustomizationStatus = 'default' | 'customized'

export type ProgramStateDefaults = Record<string, number | null>

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
  programStateDefaults: ProgramStateDefaults
  onboardingCompleted: boolean
  liveOnboardingDismissed: boolean
  /** "Don't ask again" opt-out for the post-workout beta feedback prompt. */
  postWorkoutFeedbackDismissed: boolean
  /** Only used to pick the DOTS coefficient set; null shows the xBW fallback. */
  sex?: Sex | null
}

export type ProgramTemplateSummary = {
  id: string
  name: string
  source: 'linear_strength' | 'training_max_wave' | 'wave_powerbuilding' | 'volume_strength' | 'custom_program'
  sourceLabel: string
  origin: ProgramTemplateOrigin
  description: string
  daysPerWeek: number
  progressionLabel: string
  complexity: string
  tags: string[]
  requiredState: ProgramStateRequirement[]
  available: boolean
  /**
   * Presentational programme-family grouping. Sourced from `template-families.ts` and merged onto
   * summaries in both the fallback catalogue and the DB path; absent for custom/user templates.
   */
  familyId?: string
  variantLabel?: string
  variantShortLabel?: string
  variantDescription?: string
  variantSortOrder?: number
}

export type ProgramStateType = 'training_max' | 'one_rep_max' | 'working_load' | 'five_rep_max' | 'manual'

export type ProgramStateRequirement = {
  key: string
  movementId: string
  type: ProgramStateType
  label?: string
}

export type ProgramStateInput = ProgramStateRequirement & {
  value: number | null
  unit?: Unit
  /** Last time the persisted state row changed (progression accepted, manual edit). */
  updatedAt?: string | null
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

export type ProgramSetupPreviewMovement = {
  slotId: string
  templateSlotId: string
  phaseKey: string
  phaseLabel: string
  setupPhaseKey: string
  role: MovementRole
  roleLabel: string
  defaultMovementId: string
  defaultMovementName: string
  targetSummary: string
  progressionRuleId?: string | null
  replacementOptions: MovementSwapOption[]
}

export type ProgramSetupPreviewSession = {
  id: string
  label: string
  title: string
  estimatedMinutes: number
  movementSummary: string
  keyPrescription: string
  movements: ProgramSetupPreviewMovement[]
}

export type SessionHardness = 'Light' | 'Medium' | 'Hard' | 'Deload'

export type ProgramSetupPreviewWeek = {
  index: number
  label: string
  phaseKey: string
  phaseLabel: string
  subtitle: string
  summary: string
  hardness: SessionHardness
  /** Representative main-lift working intensity as a 0–1 fraction; undefined when the template is
   *  not percent-of-state (working-load / RPE / user-selected) so the intensity ramp degrades. */
  intensityPercent?: number
  sessions: ProgramSetupPreviewSession[]
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
  previewWeeks: ProgramSetupPreviewWeek[]
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
  /** Present (as 'ad_hoc') on snapshots of plan-less one-off sessions. */
  kind?: 'ad_hoc'
  title: string
  programTitle: string
  templateId: string
  weekIndex: number
  weekLabel: string
  /** null for ad-hoc sessions — they have no prescribed intensity. */
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
  isAdHoc?: boolean
  /** Favourite state of the whole workout lineage (the session or the workout it repeats). */
  isFavorite?: boolean
  /** Root session this one was repeated from; null for originals. */
  sourceSessionId?: string | null
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
  /** Plain-language "why" behind the recommendation, shown in the coaching receipt. */
  rationale?: string | null
  previousValue?: number | null
  recommendedValue?: number | null
  /** When the decision was accepted/dismissed; null while pending. */
  resolvedAt?: string | null
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
  isAdHoc?: boolean
  isFavorite?: boolean
}

/** A favourited ad-hoc session, listed on the Plans page as a restartable workout. */
export type FavoriteWorkout = {
  sessionId: string
  title: string
  movementNames: string[]
  movementCount: number
  setCount: number
  completedAt: string | null
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
  /** True when any session in the bucket was a planned deload — the volume trend must not read the drop as decline. */
  isDeload?: boolean
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

/**
 * What the history dashboard server fn actually returns. `insights` is built
 * alongside `buildHistoryDashboard` (not inside it) so `getProgramOverviewFn`,
 * which reuses the dashboard builder for bodyLoad only, never pays its cost.
 */
export type HistoryDashboardWithInsights = HistoryDashboard & { insights: HistoryInsights }

export type Sex = 'male' | 'female'

export type BodyweightEntry = {
  id: string
  /** Calendar date (YYYY-MM-DD) the weight applies to; one entry per day. */
  recordedOn: string
  /** Stored canonically in kg; converted to display units at the edge. */
  weightKg: number
}

// --- Insight signal enums -------------------------------------------------
// Every user-facing verdict resolves to one of these values in a pure, tested
// function; components render copy from the enum and never judge inline.

export type E1rmTrendSignal = 'rising' | 'flat' | 'declining' | 'detraining' | 'insufficient'

export type StallSignal = 'progressing' | 'watch' | 'stalled' | 'insufficient'

export type StrengthScoreKind = 'dots' | 'bw_multiple' | 'total' | 'insufficient'

export type CalibrationSignal = 'on_target' | 'leaning_easy' | 'leaning_hard' | 'no_rir_data'

export type RirFatigueSignal = 'clear' | 'fatigue_rising' | 'insufficient'

export type BalanceSignal = 'balanced' | 'push_heavy' | 'pull_heavy' | 'legs_light' | 'insufficient'

export type VolumeTrendSignal = 'rising' | 'flat' | 'declining' | 'deload_planned' | 'insufficient'

export type DataLifecycle = 'empty' | 'cold_start' | 'warming' | 'established' | 'stale_returning'

export type PlanState = 'none' | 'active' | 'active_week1' | 'active_deload' | 'completed' | 'paused'

export type InsightGating = {
  lifecycle: DataLifecycle
  planState: PlanState
  /** Week-1 / deload / cold-start: no "vs last week" deltas, no "behind" copy. */
  suppressWeekComparison: boolean
  deloadWeek: boolean
  /** Long gap since training: frame as "welcome back", not current strength. */
  staleWelcomeBack: boolean
}

// --- Insight series & aggregates -------------------------------------------

export type E1rmPoint = {
  /** Session date (completedAt ?? scheduledDate, ISO). One point per session per lift. */
  date: string
  sessionId: string
  e1rm: number
  load: number
  reps: number
  rir: number | null
  /** Fat-finger guard: rendered hollow, excluded from trend/PR/stall/velocity/DOTS. */
  outlier: boolean
}

export type RepMaxBest = {
  load: number
  reps: number
  date: string
}

/** Best load lifted for at least 1 / 3 / 5 reps. */
export type RepMaxBests = {
  oneRm: RepMaxBest | null
  threeRm: RepMaxBest | null
  fiveRm: RepMaxBest | null
}

export type LiftE1rmSeries = {
  movementId: string
  movementName: string
  /** Ascending by date. Range slicing and signal classification happen client-side. */
  points: E1rmPoint[]
  repMaxBests: RepMaxBests
}

export type StallStatus = {
  signal: StallSignal
  weeksSincePr: number | null
  lastPrDate: string | null
}

export type TotalPoint = {
  date: string
  /** Best-so-far squat+bench+deadlift e1RM total, display units. */
  total: number
  totalKg: number
  /** Nearest logged bodyweight to this date; null gates the per-point DOTS. */
  bodyweightKg: number | null
  dots: number | null
  bwMultiple: number | null
}

export type StrengthScore = {
  kind: StrengthScoreKind
  /** DOTS points, xBW multiple, or display-unit total depending on kind. */
  value: number | null
  total: number | null
  totalKg: number | null
  bodyweightKg: number | null
  asOfDate: string | null
}

export type WeeklyCount = {
  weekStart: string
  weekLabel: string
  sessionCount: number
}

export type ConsistencySummary = {
  avgSessionsPerWeek: number | null
  longestStreakWeeks: number
  currentStreakWeeks: number
  weeksTrained: number
  totalWeeks: number
  percentWeeksTrained: number | null
}

export type WeeklyRirSample = {
  weekStart: string
  weekLabel: string
  pairedSets: number
  meanActualRir: number
  /** mean(actualRir − targetRir); positive = finishing easier than prescribed. */
  meanGap: number
}

export type CalibrationSummary = {
  signal: CalibrationSignal
  meanGap: number | null
  pairedSetCount: number
  weekly: WeeklyRirSample[]
  rirFatigue: RirFatigueSignal
}

export type WeeklyRegionSets = {
  weekStart: string
  weekLabel: string
  /** Fractional set attribution via body-load region weights; sums reconcile with totalSets. */
  regionSets: Partial<Record<BodyRegionId, number>>
  totalSets: number
}

export type BalanceSummary = {
  signal: BalanceSignal
  pushSets: number
  pullSets: number
  legSets: number
  coreSets: number
  totalSets: number
  weeks: number
}

export type MilestoneKind = 'tonnage' | 'sessions' | 'sets'

export type Milestone = {
  kind: MilestoneKind
  threshold: number
  label: string
}

export type MilestoneSummary = {
  earned: Milestone[]
  nextUp: (Milestone & { progressPercent: number }) | null
}

export type HistoryInsights = {
  /** Server timestamp all "weeks since"/range math keys off — never new Date() in render. */
  generatedAt: string
  firstSessionDate: string | null
  units: Unit | null
  liftSeries: LiftE1rmSeries[]
  totalSeries: TotalPoint[]
  /** Full-range weekly buckets (unlike dashboard.weeklyVolume's last-8 cap). */
  weeklyVolume: HistoryWeeklyVolume[]
  weeklyRegionSets: WeeklyRegionSets[]
  weeklySessions: WeeklyCount[]
  consistency: ConsistencySummary
  calibration: CalibrationSummary
  bodyweight: { entries: BodyweightEntry[]; sex: Sex | null }
  strengthScore: StrengthScore
  milestones: MilestoneSummary
  lifetime: { tonnage: number; sets: number; reps: number; sessions: number }
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

export type ProgramSessionStamp = {
  /** Global session index at the time the session was planned (snapshot weekIndex). */
  weekIndex: number
  completedAt: string
}

export type ProgramStateOverview = {
  movementId: string
  movementName: string
  stateKey: string
  stateType: ProgramStateType
  label?: string | null
  value: number
  units: Unit
  /** Value at program start, reconstructed from the earliest accepted progression decision. */
  startValue: number
  updatedAt?: string | null
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
    movementSummary: string
    keyPrescription: string
    movements: Array<{
      role: MovementRole
      movementName: string
      targetSummary: string
    }>
    mainCount: number
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
  /** Full accepted-decision history for this program, newest first. */
  acceptedDecisions: ProgressionDecision[]
  /** Completed program sessions: global session index + completion time, for phase attribution. */
  sessionStamps: ProgramSessionStamp[]
}
