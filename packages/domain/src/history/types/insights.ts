import type { BodyweightEntry, Sex } from '@sheetless/domain/account/types'
import type { Unit } from '@sheetless/domain/shared/types'
import type {
  BodyRegionId,
  HistoryDashboard,
  HistoryWeeklyVolume,
} from '@sheetless/domain/history/types/dashboard'

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

export type E1rmPoint = {
  /** Scheduled workout calendar date (YYYY-MM-DD). One point per session per lift. */
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
  /** Operational server generation timestamp for cache/debug visibility. */
  generatedAt: string
  /** Current calendar date in `timeZone`; anchors all day/week calculations. */
  today: string
  /** Account IANA timezone used to derive `today`. */
  timeZone: string
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
  bodyweight: { entries: BodyweightEntry[]; sex: Sex | null; units: Unit }
  strengthScore: StrengthScore
  milestones: MilestoneSummary
  lifetime: { tonnage: number; sets: number; reps: number; sessions: number }
}

/**
 * What the history dashboard server fn actually returns. `insights` is built
 * alongside `buildHistoryDashboard` (not inside it) so program overview reads
 * never pay the full insight-building cost.
 */
export type HistoryDashboardWithInsights = HistoryDashboard & { insights: HistoryInsights }
