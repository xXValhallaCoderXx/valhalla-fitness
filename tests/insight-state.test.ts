import { describe, expect, it } from 'vitest'
import {
  COLD_START_MAX_SESSIONS,
  ESTABLISHED_MIN_SESSIONS,
  STALE_RETURNING_WEEKS,
  dataLifecycleLabels,
  resolveInsightGating,
  resolveVolumeTrendSignal,
  volumeTrendLabels,
  type InsightGatingInput,
} from '../src/domains/history/lib/insight-state'
import type { HistoryWeeklyVolume, InsightGating } from '../src/shared/types'

const NOW = '2026-07-05T00:00:00Z'

function gatingInput(partial: Partial<InsightGatingInput> = {}): InsightGatingInput {
  return {
    completedSessions: partial.completedSessions ?? 10,
    lastCompletedAt:
      'lastCompletedAt' in partial ? (partial.lastCompletedAt ?? null) : '2026-07-01',
    now: partial.now ?? NOW,
    program: 'program' in partial ? (partial.program ?? null) : null,
  }
}

function program(
  partial: Partial<NonNullable<InsightGatingInput['program']>> = {},
): NonNullable<InsightGatingInput['program']> {
  return {
    status: 'status' in partial ? (partial.status ?? null) : 'active',
    weekNumber: 'weekNumber' in partial ? (partial.weekNumber ?? null) : 3,
    hardness: 'hardness' in partial ? (partial.hardness ?? null) : 'Medium',
  }
}

function gating(partial: Partial<InsightGating> = {}): InsightGating {
  return {
    lifecycle: partial.lifecycle ?? 'established',
    planState: partial.planState ?? 'active',
    suppressWeekComparison: partial.suppressWeekComparison ?? false,
    deloadWeek: partial.deloadWeek ?? false,
    staleWelcomeBack: partial.staleWelcomeBack ?? false,
  }
}

function week(
  weekStart: string,
  volume: number,
  partial: Partial<HistoryWeeklyVolume> = {},
): HistoryWeeklyVolume {
  return {
    weekStart,
    weekLabel: weekStart.slice(5),
    volume,
    completedSets: partial.completedSets ?? 10,
    sessionCount: partial.sessionCount ?? 3,
    ...('isDeload' in partial ? { isDeload: partial.isDeload } : {}),
  }
}

describe('resolveInsightGating lifecycle', () => {
  it('maps session-count boundaries 0/1/2/7/8', () => {
    const lifecycleFor = (completedSessions: number) =>
      resolveInsightGating(gatingInput({ completedSessions })).lifecycle
    expect(lifecycleFor(0)).toBe('empty')
    expect(lifecycleFor(COLD_START_MAX_SESSIONS)).toBe('cold_start')
    expect(lifecycleFor(2)).toBe('warming')
    expect(lifecycleFor(ESTABLISHED_MIN_SESSIONS - 1)).toBe('warming')
    expect(lifecycleFor(ESTABLISHED_MIN_SESSIONS)).toBe('established')
  })

  it('does not go stale at exactly STALE_RETURNING_WEEKS before now', () => {
    // NOW minus exactly 28 days.
    const result = resolveInsightGating(
      gatingInput({ completedSessions: 4, lastCompletedAt: '2026-06-07T00:00:00Z' }),
    )
    expect(STALE_RETURNING_WEEKS).toBe(4)
    expect(result.lifecycle).toBe('warming')
    expect(result.staleWelcomeBack).toBe(false)
  })

  it('flips to stale_returning at 4 weeks + 1 day before now', () => {
    const result = resolveInsightGating(
      gatingInput({ completedSessions: 4, lastCompletedAt: '2026-06-06T00:00:00Z' }),
    )
    expect(result.lifecycle).toBe('stale_returning')
    expect(result.staleWelcomeBack).toBe(true)
  })

  it('requires at least 2 sessions — a single old session stays cold_start', () => {
    const result = resolveInsightGating(
      gatingInput({ completedSessions: 1, lastCompletedAt: '2025-01-01' }),
    )
    expect(result.lifecycle).toBe('cold_start')
    expect(result.staleWelcomeBack).toBe(false)
  })

  it('stale overrides established', () => {
    const result = resolveInsightGating(
      gatingInput({ completedSessions: 20, lastCompletedAt: '2026-01-01' }),
    )
    expect(result.lifecycle).toBe('stale_returning')
  })

  it('never goes stale without a lastCompletedAt', () => {
    const result = resolveInsightGating(
      gatingInput({ completedSessions: 20, lastCompletedAt: null }),
    )
    expect(result.lifecycle).toBe('established')
  })
})

describe('resolveInsightGating plan state', () => {
  it('maps no program and archived programs to none', () => {
    expect(resolveInsightGating(gatingInput({ program: null })).planState).toBe('none')
    expect(
      resolveInsightGating(gatingInput({ program: program({ status: 'archived' }) })).planState,
    ).toBe('none')
  })

  it('maps paused and completed statuses directly', () => {
    expect(
      resolveInsightGating(gatingInput({ program: program({ status: 'paused' }) })).planState,
    ).toBe('paused')
    expect(
      resolveInsightGating(gatingInput({ program: program({ status: 'completed' }) })).planState,
    ).toBe('completed')
  })

  it('splits active programs into week-1 / deload / plain active', () => {
    expect(
      resolveInsightGating(gatingInput({ program: program({ weekNumber: 1 }) })).planState,
    ).toBe('active_week1')
    expect(
      resolveInsightGating(gatingInput({ program: program({ hardness: 'Deload' }) })).planState,
    ).toBe('active_deload')
    expect(resolveInsightGating(gatingInput({ program: program() })).planState).toBe('active')
  })
})

describe('resolveInsightGating suppression flags', () => {
  it('suppresses week comparison in week 1 without flagging deload', () => {
    const result = resolveInsightGating(gatingInput({ program: program({ weekNumber: 1 }) }))
    expect(result.suppressWeekComparison).toBe(true)
    expect(result.deloadWeek).toBe(false)
  })

  it('suppresses week comparison on a deload week and flags deloadWeek', () => {
    const result = resolveInsightGating(gatingInput({ program: program({ hardness: 'Deload' }) }))
    expect(result.suppressWeekComparison).toBe(true)
    expect(result.deloadWeek).toBe(true)
  })

  it('suppresses week comparison for empty and cold_start lifecycles', () => {
    expect(
      resolveInsightGating(gatingInput({ completedSessions: 0 })).suppressWeekComparison,
    ).toBe(true)
    expect(
      resolveInsightGating(gatingInput({ completedSessions: 1 })).suppressWeekComparison,
    ).toBe(true)
  })

  it('does not suppress for an established lifter mid-program', () => {
    const result = resolveInsightGating(gatingInput({ program: program() }))
    expect(result.suppressWeekComparison).toBe(false)
    expect(result.deloadWeek).toBe(false)
    expect(result.staleWelcomeBack).toBe(false)
  })
})

describe('resolveVolumeTrendSignal', () => {
  it('deload gating wins over any week shape', () => {
    const weeks = [week('2026-06-22', 100), week('2026-06-29', 200)]
    expect(resolveVolumeTrendSignal(weeks, gating({ deloadWeek: true }))).toBe('deload_planned')
  })

  it('suppressed week comparison yields insufficient', () => {
    const weeks = [week('2026-06-22', 100), week('2026-06-29', 200)]
    expect(resolveVolumeTrendSignal(weeks, gating({ suppressWeekComparison: true }))).toBe(
      'insufficient',
    )
  })

  it('marks a deload last bucket as deload_planned', () => {
    const weeks = [week('2026-06-22', 100), week('2026-06-29', 60, { isDeload: true })]
    expect(resolveVolumeTrendSignal(weeks, gating())).toBe('deload_planned')
  })

  it('skips deload buckets when picking the comparison baseline', () => {
    const weeks = [
      week('2026-06-15', 100),
      week('2026-06-22', 60, { isDeload: true }),
      week('2026-06-29', 105),
    ]
    // 105 vs 100 (not 60) → +5% → flat.
    expect(resolveVolumeTrendSignal(weeks, gating())).toBe('flat')
  })

  it('classifies at the ±10% boundaries', () => {
    const pair = (prior: number, last: number) =>
      resolveVolumeTrendSignal([week('2026-06-22', prior), week('2026-06-29', last)], gating())
    expect(pair(100, 110)).toBe('rising')
    expect(pair(100, 109)).toBe('flat')
    expect(pair(100, 91)).toBe('flat')
    expect(pair(100, 90)).toBe('declining')
  })

  it('needs two usable buckets', () => {
    expect(resolveVolumeTrendSignal([], gating())).toBe('insufficient')
    expect(resolveVolumeTrendSignal([week('2026-06-29', 100)], gating())).toBe('insufficient')
    const onlyDeloadBaseline = [
      week('2026-06-22', 60, { isDeload: true }),
      week('2026-06-29', 105),
    ]
    expect(resolveVolumeTrendSignal(onlyDeloadBaseline, gating())).toBe('insufficient')
  })

  it('guards a zero-volume baseline', () => {
    const weeks = [week('2026-06-22', 0), week('2026-06-29', 100)]
    expect(resolveVolumeTrendSignal(weeks, gating())).toBe('insufficient')
  })
})

describe('label maps', () => {
  it('covers every lifecycle and volume trend value', () => {
    expect(dataLifecycleLabels.stale_returning).toBe('Welcome back')
    expect(volumeTrendLabels).toEqual({
      rising: 'Building up',
      flat: 'Steady output',
      declining: 'Backing off',
      deload_planned: 'Lighter on purpose — deload week',
      insufficient: 'Building baseline',
    })
  })
})
