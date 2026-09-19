import { describe, expect, it } from 'vitest'
import { buildStrengthScoreTrace } from '@sheetless/domain/history/strength-score-trace'
import type { BodyweightEntry } from '@sheetless/domain/account/types'
import type { E1rmPoint, LiftE1rmSeries, StrengthScore } from '@sheetless/domain/history/types'

const TODAY = '2026-08-06'

function point(date: string, e1rm: number, partial: Partial<E1rmPoint> = {}): E1rmPoint {
  return {
    date,
    sessionId: partial.sessionId ?? `session-${date}`,
    e1rm,
    load: partial.load ?? e1rm,
    reps: partial.reps ?? 1,
    rir: partial.rir ?? null,
    outlier: partial.outlier ?? false,
  }
}

function series(movementId: string, points: E1rmPoint[]): LiftE1rmSeries {
  return { movementId, movementName: movementId, points, repMaxBests: { oneRm: null, threeRm: null, fiveRm: null } }
}

// The design doc's own account: 142.9 + 105.0 + 206.6 = 454.5 kg at 71 kg, male → 338.1.
const liftSeries = [
  series('squat', [point('2026-08-03', 142.9, { load: 122.5, reps: 3, rir: 2 })]),
  series('bench_press', [point('2026-08-06', 105, { load: 90, reps: 3, rir: 2 })]),
  series('deadlift', [point('2026-07-22', 206.6, { load: 167.5, reps: 5, rir: 2 })]),
]

const entries: BodyweightEntry[] = [{ id: 'bw-1', recordedOn: '2026-07-06', weightKg: 71 }]

const dotsScoreInput: StrengthScore = {
  kind: 'dots',
  value: 338.1,
  total: 454.5,
  totalKg: 454.5,
  bodyweightKg: 71,
  asOfDate: TODAY,
}

const build = (over: Partial<Parameters<typeof buildStrengthScoreTrace>[0]> = {}) =>
  buildStrengthScoreTrace({
    score: dotsScoreInput,
    liftSeries,
    entries,
    sex: 'male',
    today: TODAY,
    units: 'kg',
    ...over,
  })

describe('buildStrengthScoreTrace', () => {
  it('reproduces the DOTS derivation the design shows', () => {
    const result = build()
    expect(result?.trace.subject).toBe('Strength score · DOTS')
    expect(result?.trace.context).toBe('As of Thu 6 Aug · male coefficients')
    expect(result?.trace.expression).toBe('DOTS = total × 500 ÷ (a + b·bw + c·bw² + d·bw³ + e·bw⁴)')
    expect(result?.trace.evaluated).toBe('= 454.5 × 500 ÷ 672.17')
    expect(result?.trace.result).toBe('338.1 points')
  })

  it('names the set behind each lift', () => {
    const inputs = build()?.trace.inputs ?? []
    expect(inputs.map((input) => input.label)).toEqual([
      'Squat e1RM',
      'Bench e1RM',
      'Deadlift e1RM',
      'Total',
      'Bodyweight',
    ])
    expect(inputs[0]).toMatchObject({ value: '142.9 kg', provenance: '3 Aug · 122.5 kg × 3 @ RIR 2' })
    expect(inputs[4]).toMatchObject({ value: '71 kg', provenance: 'nearest entry, 6 Jul' })
  })

  // The panel prints a warning when this is false, so it has to mean something.
  it('confirms the score re-derives from its own inputs', () => {
    expect(build()?.trace.matchesPlannedLoad).toBe(true)
    expect(build({ score: { ...dotsScoreInput, value: 999 } })?.trace.matchesPlannedLoad).toBe(false)
  })

  it('marks the rung in force and carries the coefficients only for DOTS', () => {
    const dots = build()
    expect(dots?.fallback.steps.map((step) => [step.kind, step.active])).toEqual([
      ['dots', true],
      ['bw_multiple', false],
      ['total', false],
      ['insufficient', false],
    ])
    expect(dots?.coefficients?.terms.map((term) => term.symbol)).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(dots?.coefficients?.clamp).toEqual([40, 210])

    const multiple = build({
      score: { ...dotsScoreInput, kind: 'bw_multiple', value: 6.4 },
      sex: null,
    })
    expect(multiple?.coefficients).toBeNull()
    expect(multiple?.trace.result).toBe('6.4 × bodyweight')
    expect(multiple?.fallback.steps.find((step) => step.active)?.kind).toBe('bw_multiple')
  })

  it('reports how stale the bodyweight reading is', () => {
    expect(build()?.bodyweightRecordedOn).toBe('2026-07-06')
    expect(build()?.bodyweightAgeDays).toBe(31)
  })

  it('returns nothing rather than a fabricated trace', () => {
    expect(build({ score: { ...dotsScoreInput, kind: 'insufficient', value: null } })).toBeNull()
    // Deadlift missing — a partial total is not a total.
    expect(build({ liftSeries: liftSeries.slice(0, 2) })).toBeNull()
  })
})
