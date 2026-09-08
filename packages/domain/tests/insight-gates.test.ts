import { describe, expect, it } from 'vitest'
import {
  CONSISTENCY_MIN_WEEKS,
  INSIGHT_GATE_ORDER,
  TREND_MIN_CHART_POINTS,
  lockedInsightSteps,
  resolveInsightGates,
  type InsightGateInput,
} from '../src/history/insight-gates'
import type { LiftE1rmSeries } from '../src/history/types'
import { BALANCE_MIN_SETS } from '../src/history/muscle-volume'
import { CALIBRATION_MIN_PAIRED_SETS } from '../src/history/calibration'
import { TREND_MIN_POINTS, TREND_MIN_SPAN_DAYS } from '../src/history/strength'

const NO_REP_MAX_BESTS = { oneRm: null, threeRm: null, fiveRm: null }

/** One lift with `count` e1RM points, spaced `spacingDays` apart from 2026-01-01. */
function lift(movementId: string, movementName: string, count: number, spacingDays: number): LiftE1rmSeries {
  return { movementId, movementName, points: liftPoints(count, spacingDays), repMaxBests: NO_REP_MAX_BESTS }
}

function liftPoints(count: number, spacingDays: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(2026, 0, 1) + index * spacingDays * 24 * 60 * 60 * 1000)
    return {
      date: date.toISOString().slice(0, 10),
      sessionId: `session-${index}`,
      e1rm: 100 + index,
      load: 100,
      reps: 5,
      rir: 2,
      outlier: false,
    }
  })
}

function input(overrides: Partial<InsightGateInput> = {}): InsightGateInput {
  return {
    liftSeries: [],
    weeklyVolume: [],
    weeklyRegionSets: [],
    consistency: {
      avgSessionsPerWeek: null,
      longestStreakWeeks: 0,
      currentStreakWeeks: 0,
      weeksTrained: 0,
      totalWeeks: 0,
      percentWeeksTrained: null,
    },
    calibration: { signal: 'no_rir_data', meanGap: null, pairedSetCount: 0, weekly: [], rirFatigue: 'insufficient' },
    strengthScore: { kind: 'insufficient', value: null, total: null, totalKg: null, bodyweightKg: null, asOfDate: null },
    ...overrides,
  }
}

const weeks = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    weekStart: `2026-01-0${index + 1}`,
    weekLabel: `W${index + 1}`,
    volume: 1000,
    completedSets: 10,
    sessionCount: 1,
    isDeload: false,
  }))

const regionWeeks = (totalSets: number) => [
  { weekStart: '2026-01-01', weekLabel: 'W1', regionSets: { quads: totalSets }, totalSets },
]

describe('resolveInsightGates — boundaries', () => {
  it('opens the strength trend only with enough points AND enough span', () => {
    const enough = [lift('squat', 'Squat', TREND_MIN_POINTS, 10)]
    const tooFewPoints = [lift('squat', 'Squat', TREND_MIN_POINTS - 1, 10)]
    // Enough sessions, but all crammed into a few days — the trend would be noise.
    const tooShortSpan = [lift('squat', 'Squat', TREND_MIN_POINTS, 1)]

    expect(resolveInsightGates(input({ liftSeries: enough })).strength_trend.unlocked).toBe(true)
    expect(resolveInsightGates(input({ liftSeries: tooFewPoints })).strength_trend.unlocked).toBe(false)
    expect(resolveInsightGates(input({ liftSeries: tooShortSpan })).strength_trend.unlocked).toBe(false)
    expect(spanOf(tooShortSpan)).toBeLessThan(TREND_MIN_SPAN_DAYS)
  })

  it('counts progress against the lift closest to unlocking, and names it', () => {
    const series = [lift('bench_press', 'Bench press', 1, 7), lift('squat', 'Squat', 2, 7)]
    const gate = resolveInsightGates(input({ liftSeries: series })).strength_trend
    expect(gate.progress).toEqual({ current: 2, required: TREND_MIN_POINTS, subject: 'squat' })
  })

  it('opens volume, consistency, balance and effort exactly at their thresholds', () => {
    expect(resolveInsightGates(input({ weeklyVolume: weeks(TREND_MIN_CHART_POINTS - 1) })).volume_trend.unlocked).toBe(false)
    expect(resolveInsightGates(input({ weeklyVolume: weeks(TREND_MIN_CHART_POINTS) })).volume_trend.unlocked).toBe(true)

    const consistency = (totalWeeks: number) => ({ ...input().consistency, totalWeeks })
    expect(resolveInsightGates(input({ consistency: consistency(CONSISTENCY_MIN_WEEKS - 1) })).consistency.unlocked).toBe(false)
    expect(resolveInsightGates(input({ consistency: consistency(CONSISTENCY_MIN_WEEKS) })).consistency.unlocked).toBe(true)

    expect(resolveInsightGates(input({ weeklyRegionSets: regionWeeks(BALANCE_MIN_SETS - 1) })).muscle_balance.unlocked).toBe(false)
    expect(resolveInsightGates(input({ weeklyRegionSets: regionWeeks(BALANCE_MIN_SETS) })).muscle_balance.unlocked).toBe(true)

    const calibration = (pairedSetCount: number) => ({ ...input().calibration, pairedSetCount })
    expect(resolveInsightGates(input({ calibration: calibration(CALIBRATION_MIN_PAIRED_SETS - 1) })).effort.unlocked).toBe(false)
    expect(resolveInsightGates(input({ calibration: calibration(CALIBRATION_MIN_PAIRED_SETS) })).effort.unlocked).toBe(true)
  })

  it('follows the strength score its own resolver already computed', () => {
    expect(resolveInsightGates(input()).strength_score.unlocked).toBe(false)
    const scored = { kind: 'dots' as const, value: 338.1, total: 454.5, totalKg: 454.5, bodyweightKg: 71, asOfDate: '2026-08-06' }
    expect(resolveInsightGates(input({ strengthScore: scored })).strength_score.unlocked).toBe(true)
  })
})

describe('lockedInsightSteps', () => {
  it('lists only what is still locked, in earn order', () => {
    const gates = resolveInsightGates(input())
    const steps = lockedInsightSteps(gates)
    expect(steps).toHaveLength(INSIGHT_GATE_ORDER.length)
    expect(steps[0]).toBe(gates.volume_trend.requirement)
  })

  it('drops a step as soon as its gate opens', () => {
    const gates = resolveInsightGates(input({ weeklyVolume: weeks(TREND_MIN_CHART_POINTS) }))
    expect(lockedInsightSteps(gates)).not.toContain(gates.volume_trend.requirement)
  })

  it('quotes the real thresholds, so the copy cannot drift from the code', () => {
    const gates = resolveInsightGates(input())
    expect(gates.strength_trend.requirement).toContain(String(TREND_MIN_POINTS))
    expect(gates.muscle_balance.requirement).toContain(String(BALANCE_MIN_SETS))
    expect(gates.effort.requirement).toContain(String(CALIBRATION_MIN_PAIRED_SETS))
    expect(gates.strength_trend.requirementTechnical).toContain(String(TREND_MIN_SPAN_DAYS))
  })
})

function spanOf(series: Array<{ points: Array<{ date: string }> }>): number {
  const times = series[0].points.map((point) => new Date(point.date).getTime())
  return (Math.max(...times) - Math.min(...times)) / (24 * 60 * 60 * 1000)
}
