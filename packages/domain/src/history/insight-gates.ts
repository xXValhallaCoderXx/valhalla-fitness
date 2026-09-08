import { BALANCE_MIN_SETS } from '@sheetless/domain/history/muscle-volume'
import { CALIBRATION_MIN_PAIRED_SETS } from '@sheetless/domain/history/calibration'
import { TREND_MIN_POINTS, TREND_MIN_SPAN_DAYS } from '@sheetless/domain/history/strength'
import type {
  CalibrationSummary,
  ConsistencySummary,
  HistoryWeeklyVolume,
  LiftE1rmSeries,
  StrengthScore,
  WeeklyRegionSets,
} from '@sheetless/domain/history/types'

/**
 * Every insight card that can be too early to mean anything.
 *
 * The thresholds live with the maths that uses them (`strength.ts`, `muscle-volume.ts`,
 * `calibration.ts`) and are imported here rather than restated, so the number a card shows the
 * lifter and the number the code actually gates on cannot drift apart.
 */
export type InsightGateId =
  | 'strength_score'
  | 'strength_trend'
  | 'volume_trend'
  | 'consistency'
  | 'muscle_balance'
  | 'effort'

export type InsightGateProgress = {
  current: number
  required: number
  /** What is being counted, when it isn't the account as a whole — e.g. "squat". */
  subject?: string
}

export type InsightGate = {
  id: InsightGateId
  unlocked: boolean
  /** Null when the requirement isn't a count (e.g. "needs a bodyweight entry"). */
  progress: InsightGateProgress | null
  /** Guided voice: what opens this card, in plain words. */
  requirement: string
  /** Full voice: the actual rule. */
  requirementTechnical: string
}

/**
 * Two points is the minimum that can draw a line rather than a dot. Four call sites hardcoded
 * this before it had a name.
 */
export const TREND_MIN_CHART_POINTS = 2

/** Two weeks before a consistency read means anything. */
export const CONSISTENCY_MIN_WEEKS = 2

export type InsightGateInput = {
  liftSeries: LiftE1rmSeries[]
  weeklyVolume: HistoryWeeklyVolume[]
  weeklyRegionSets: WeeklyRegionSets[]
  consistency: ConsistencySummary
  calibration: CalibrationSummary
  strengthScore: StrengthScore
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** The lift closest to unlocking a trend — what the locked card counts towards. */
function leadingLift(liftSeries: LiftE1rmSeries[]): LiftE1rmSeries | null {
  let leader: LiftE1rmSeries | null = null
  for (const series of liftSeries) {
    if (!leader || series.points.length > leader.points.length) leader = series
  }
  return leader
}

function spanDays(series: LiftE1rmSeries | null): number {
  if (!series || series.points.length < 2) return 0
  const times = series.points.map((point) => new Date(point.date).getTime()).filter(Number.isFinite)
  if (times.length < 2) return 0
  return (Math.max(...times) - Math.min(...times)) / MS_PER_DAY
}

export function resolveInsightGates(input: InsightGateInput): Record<InsightGateId, InsightGate> {
  const lead = leadingLift(input.liftSeries)
  const leadPoints = lead?.points.length ?? 0
  const totalRegionSets = input.weeklyRegionSets.reduce((sum, week) => sum + week.totalSets, 0)
  const liftsWithWork = input.liftSeries.filter((series) => series.points.length > 0).length

  return {
    strength_score: {
      id: 'strength_score',
      unlocked: input.strengthScore.kind !== 'insufficient',
      progress: { current: Math.min(liftsWithWork, 3), required: 3 },
      requirement: 'Opens once squat, bench and deadlift each have a logged set, plus a bodyweight.',
      requirementTechnical: 'Needs squat + bench + deadlift e1RM and a bodyweight entry (sex for DOTS).',
    },
    strength_trend: {
      id: 'strength_trend',
      unlocked: leadPoints >= TREND_MIN_POINTS && spanDays(lead) >= TREND_MIN_SPAN_DAYS,
      progress: { current: leadPoints, required: TREND_MIN_POINTS, subject: lead?.movementName.toLowerCase() },
      requirement: `Appears after ${TREND_MIN_POINTS} sessions of a lift, spread over about three weeks.`,
      requirementTechnical: `≥ ${TREND_MIN_POINTS} e1RM points spanning ≥ ${TREND_MIN_SPAN_DAYS} days.`,
    },
    volume_trend: {
      id: 'volume_trend',
      unlocked: input.weeklyVolume.length >= TREND_MIN_CHART_POINTS,
      progress: { current: input.weeklyVolume.length, required: TREND_MIN_CHART_POINTS },
      requirement: 'Appears once you have two training weeks to compare.',
      requirementTechnical: `≥ ${TREND_MIN_CHART_POINTS} weekly volume buckets in range.`,
    },
    consistency: {
      id: 'consistency',
      unlocked: input.consistency.totalWeeks >= CONSISTENCY_MIN_WEEKS,
      progress: { current: input.consistency.totalWeeks, required: CONSISTENCY_MIN_WEEKS },
      requirement: 'Builds over your first couple of weeks.',
      requirementTechnical: `≥ ${CONSISTENCY_MIN_WEEKS} tracked weeks.`,
    },
    muscle_balance: {
      id: 'muscle_balance',
      unlocked: totalRegionSets >= BALANCE_MIN_SETS,
      progress: { current: Math.round(totalRegionSets), required: BALANCE_MIN_SETS },
      requirement: `Appears after about ${BALANCE_MIN_SETS} logged sets.`,
      requirementTechnical: `≥ ${BALANCE_MIN_SETS} attributed sets in range.`,
    },
    effort: {
      id: 'effort',
      unlocked: input.calibration.pairedSetCount >= CALIBRATION_MIN_PAIRED_SETS,
      progress: { current: input.calibration.pairedSetCount, required: CALIBRATION_MIN_PAIRED_SETS },
      requirement: `Appears once ${CALIBRATION_MIN_PAIRED_SETS} sets have both a planned and a logged effort.`,
      requirementTechnical: `≥ ${CALIBRATION_MIN_PAIRED_SETS} sets with prescribed + logged RIR.`,
    },
  }
}

/** Order the cold-start list reads in — cheapest to earn first. */
export const INSIGHT_GATE_ORDER: InsightGateId[] = [
  'volume_trend',
  'consistency',
  'strength_trend',
  'muscle_balance',
  'effort',
  'strength_score',
]

/**
 * The "insights unlock as you train" list. Derived from the gates so it can never drift from the
 * thresholds it describes — the previous hardcoded version claimed "2 sessions" for a rule that
 * actually counts weeks.
 */
export function lockedInsightSteps(gates: Record<InsightGateId, InsightGate>): string[] {
  return INSIGHT_GATE_ORDER.filter((id) => !gates[id].unlocked).map((id) => gates[id].requirement)
}
