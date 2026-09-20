import type {
  CalibrationSignal,
  CalibrationSummary,
  RirFatigueSignal,
  WeeklyRirSample,
} from '@sheetless/domain/history/types'
import {
  formatDateKey,
  formatWeekLabel,
  parseDate,
  startOfWeek,
  type HistorySessionInput,
} from '@sheetless/domain/history/history'

export const CALIBRATION_MIN_PAIRED_SETS = 10
export const CALIBRATION_GAP_THRESHOLD = 0.75
export const CALIBRATION_WINDOW_WEEKS = 6
export const RIR_TREND_WEEKS = 3
export const RIR_TREND_DROP = 1.0
export const RIR_TREND_MIN_WEEK_SETS = 3

export const calibrationSignalLabels: Record<CalibrationSignal, string> = {
  on_target: 'Dialed in',
  leaning_easy: 'Room to push',
  leaning_hard: 'Running hot',
  no_rir_data: 'Not enough RIR data',
}

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS

type PairedSample = {
  time: number
  date: Date
  actualRir: number
  /** actualRir − targetRir; positive = finishing easier than prescribed. */
  gap: number
}

function round2(value: number) {
  const rounded = Math.round(value * 100) / 100
  // Normalize -0 so results compare cleanly with Object.is.
  return rounded === 0 ? 0 : rounded
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/**
 * Prescription calibration from paired RIR on plan sessions only: a paired set
 * is completed with both targetRir and actualRir logged. Ad-hoc sessions
 * (programInstanceId == null) never count.
 */
export function buildCalibration(sessions: HistorySessionInput[], now: string): CalibrationSummary {
  const samples: PairedSample[] = []
  for (const session of sessions) {
    if (session.programInstanceId == null) continue
    const date = parseDate(session.scheduledDate)
    if (!date) continue
    for (const exercise of session.exercises) {
      for (const set of exercise.sets) {
        if (!set.completed || set.targetRir == null || set.actualRir == null) continue
        samples.push({
          time: date.getTime(),
          date,
          actualRir: set.actualRir,
          gap: set.actualRir - set.targetRir,
        })
      }
    }
  }

  const weekly = buildWeeklyRirSamples(samples)

  const nowTime = new Date(now).getTime()
  const cutoff = nowTime - CALIBRATION_WINDOW_WEEKS * 7 * DAY_MS
  const windowSamples = samples.filter((sample) => sample.time >= cutoff && sample.time <= nowTime)
  const pairedSetCount = windowSamples.length

  let signal: CalibrationSignal = 'no_rir_data'
  let meanGap: number | null = null
  if (pairedSetCount >= CALIBRATION_MIN_PAIRED_SETS) {
    meanGap = round2(mean(windowSamples.map((sample) => sample.gap)))
    if (Math.abs(meanGap) <= CALIBRATION_GAP_THRESHOLD) signal = 'on_target'
    else signal = meanGap > 0 ? 'leaning_easy' : 'leaning_hard'
  }

  return {
    signal,
    meanGap,
    pairedSetCount,
    weekly,
    rirFatigue: classifyRirFatigue(weekly),
  }
}

/** Monday-UTC weekly buckets over ALL paired data, ascending; empty weeks are skipped. */
function buildWeeklyRirSamples(samples: PairedSample[]): WeeklyRirSample[] {
  const buckets = new Map<string, { weekStart: Date; actuals: number[]; gaps: number[] }>()
  for (const sample of samples) {
    const weekStart = startOfWeek(sample.date)
    const key = formatDateKey(weekStart)
    const bucket = buckets.get(key) ?? { weekStart, actuals: [], gaps: [] }
    bucket.actuals.push(sample.actualRir)
    bucket.gaps.push(sample.gap)
    buckets.set(key, bucket)
  }
  return [...buckets.values()]
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
    .map((bucket) => ({
      weekStart: formatDateKey(bucket.weekStart),
      weekLabel: formatWeekLabel(bucket.weekStart),
      pairedSets: bucket.actuals.length,
      meanActualRir: round2(mean(bucket.actuals)),
      meanGap: round2(mean(bucket.gaps)),
    }))
}

/**
 * Fatigue heuristic: over the trailing RIR_TREND_WEEKS qualifying weeks
 * (pairedSets >= RIR_TREND_MIN_WEEK_SETS), strictly falling mean actual RIR
 * with a total drop >= RIR_TREND_DROP reads as fatigue accumulating.
 */
function classifyRirFatigue(weekly: WeeklyRirSample[]): RirFatigueSignal {
  const qualifying = weekly.filter((week) => week.pairedSets >= RIR_TREND_MIN_WEEK_SETS)
  if (qualifying.length < RIR_TREND_WEEKS) return 'insufficient'
  const trailing = qualifying.slice(-RIR_TREND_WEEKS)
  const strictlyFalling = trailing.every(
    (week, index) => index === 0 || week.meanActualRir < trailing[index - 1].meanActualRir,
  )
  const drop = trailing[0].meanActualRir - trailing[trailing.length - 1].meanActualRir
  return strictlyFalling && drop >= RIR_TREND_DROP ? 'fatigue_rising' : 'clear'
}

export type RirComparison = {
  /** Mean logged RIR this calendar week; null when nothing paired was logged. */
  current: number | null
  previous: number | null
  /** What the plan asked for, derived from the gap. Null when there is no week to derive it from. */
  target: number | null
}

/**
 * This week's effort against last week's.
 *
 * Anchored to the calendar like `weekOverWeekTotals`, not to array position — the weekly samples
 * only exist for weeks with paired sets, so "the previous entry" could be a month ago.
 *
 * `target` is `meanActualRir − meanGap`: target RIR varies per set, so the only honest single
 * number is the one the gap was measured against. Null rather than a guess when neither week has
 * paired data.
 */
export function weeklyRirComparison(weekly: WeeklyRirSample[], now: string): RirComparison | null {
  const nowDate = parseDate(now)
  if (!nowDate) return null
  const currentKey = formatDateKey(startOfWeek(nowDate))
  const previousKey = formatDateKey(new Date(startOfWeek(nowDate).getTime() - WEEK_MS))

  const find = (key: string) => weekly.find((sample) => sample.weekStart === key) ?? null
  const current = find(currentKey)
  const previous = find(previousKey)
  if (!current && !previous) return null

  const anchor = current ?? previous
  return {
    current: current ? round(current.meanActualRir) : null,
    previous: previous ? round(previous.meanActualRir) : null,
    target: anchor ? round(anchor.meanActualRir - anchor.meanGap) : null,
  }
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}
