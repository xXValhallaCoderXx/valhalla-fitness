import type { PlannedSession, SubstitutionReason } from '~/domains/session'
import type { MovementRole, SessionHardness, Unit } from '~/shared/types'

export type RecentHistoryEntry = {
  id: string
  title: string
  completedAt?: string | null
  scheduledDate: string
  timeZone?: string | null
  programTitle?: string | null
  weekLabel?: string | null
  hardness?: SessionHardness | null
  equipmentMode?: PlannedSession['equipmentMode']
  estimatedMinutes?: number | null
  movementCount: number
  completedSetCount: number
  plannedSetCount: number
  isAdHoc?: boolean
  isFavorite?: boolean
}

export type MovementHistorySet = {
  id: string
  setIndex: number
  targetLoad?: number | null
  targetReps?: number | null
  targetRepMin?: number | null
  targetRepMax?: number | null
  targetRir?: number | null
  /** Raw external resistance: positive = weighted, 0/null = bodyweight or loadless. */
  actualLoad?: number | null
  actualReps?: number | null
  actualRir?: number | null
  completed: boolean
  isTopSet?: boolean
  isAmrap?: boolean
  isBackoff?: boolean
}

export type MovementHistoryEntry = {
  id: string
  sessionId: string
  sessionTitle: string
  programTitle?: string | null
  scheduledDate: string
  completedAt?: string | null
  timeZone?: string | null
  units?: Unit | null
  equipmentMode?: PlannedSession['equipmentMode']
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
  /** Scheduled workout calendar date (YYYY-MM-DD). */
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
  /** Normalized external resistance; null means bodyweight/loadless. */
  load?: number | null
  reps?: number | null
  rir?: number | null
  e1rm?: number | null
  volume?: number | null
  sessionId: string
  sessionTitle: string
  /** Scheduled workout calendar date (YYYY-MM-DD). */
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
  /** Scheduled workout calendar date (YYYY-MM-DD). */
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
