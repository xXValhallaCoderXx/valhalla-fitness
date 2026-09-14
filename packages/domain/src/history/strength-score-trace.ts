import type { BodyweightEntry, Sex } from '@sheetless/domain/account/types'
import type { LiftE1rmSeries, StrengthScore, StrengthScoreKind } from '@sheetless/domain/history/types'
import type { LoadTrace, TraceInput } from '@sheetless/domain/program/load-trace'
import type { Unit } from '@sheetless/domain/shared/types'
import { formatDayMonth, formatWeekdayShortDate } from '@sheetless/domain/shared/dates'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import {
  DOTS_BW_CLAMP_KG,
  DOTS_COEFFICIENTS,
  bodyweightMultiple,
  dotsScore,
  nearestBodyweightWithAge,
  strengthScoreKindLabels,
} from '@sheetless/domain/history/dots'
import { selectPowerliftingComponents } from '@sheetless/domain/history/strength'

/** The rungs of the score's fallback, in the order they are tried. */
const FALLBACK_ORDER: StrengthScoreKind[] = ['dots', 'bw_multiple', 'total', 'insufficient']

const COEFFICIENT_SYMBOLS = ['a', 'b', 'c', 'd', 'e'] as const

export type StrengthScoreFallbackStep = {
  kind: StrengthScoreKind
  label: string
  /** The rung actually in force. */
  active: boolean
}

export type StrengthScoreCoefficients = {
  sex: Sex
  terms: Array<{ symbol: (typeof COEFFICIENT_SYMBOLS)[number]; value: number }>
  clamp: readonly [number, number]
}

export type StrengthScoreTrace = {
  /** The derivation, in the shape `LoadTracePanel` already renders. */
  trace: LoadTrace
  /** DOTS → × bodyweight → total → not enough data, with the rung in force marked. */
  fallback: { steps: StrengthScoreFallbackStep[]; requirement: string }
  /** Null unless the score resolved to DOTS — the polynomial exists nowhere else. */
  coefficients: StrengthScoreCoefficients | null
  bodyweightRecordedOn: string | null
  /** Days between that entry and today; a stale reading quietly distorts the score. */
  bodyweightAgeDays: number | null
}

/**
 * How the strength score was worked out.
 *
 * `LoadTrace` carries the derivation because it already says exactly this — subject, formula,
 * substitution, inputs — and reusing it means the panel renders unchanged. What it has no room for
 * is the fallback chain and the DOTS polynomial, so those ride alongside rather than being forced
 * into `inputs`, where they would read as terms of the sum.
 *
 * Null when the score is `insufficient` or the three lifts do not resolve: no trace beats a
 * fabricated one.
 */
export function buildStrengthScoreTrace({
  score,
  liftSeries,
  entries,
  sex,
  today,
  units,
}: {
  score: StrengthScore
  liftSeries: LiftE1rmSeries[]
  entries: BodyweightEntry[]
  sex: Sex | null
  today: string
  units: Unit | null
}): StrengthScoreTrace | null {
  if (score.kind === 'insufficient' || score.value === null || score.total === null) return null

  const components = selectPowerliftingComponents(liftSeries, score.asOfDate)
  if (!components) return null

  // Resolved exactly as `buildHistoryInsights` resolves it for the score itself. Any other rule
  // here would name an entry the score never used.
  const recorded = entries.filter((entry) => entry.recordedOn <= today)
  const bodyweight = nearestBodyweightWithAge(recorded, today)

  const inputs: TraceInput[] = components.map((component) => ({
    label: `${component.liftLabel} e1RM`,
    value: weight(component.point.e1rm, units),
    provenance: describeSet(component.point, units),
  }))
  inputs.push({
    label: 'Total',
    value: weight(score.total, units),
    provenance: 'best so far in each lift',
  })
  if (score.bodyweightKg !== null) {
    inputs.push({
      label: 'Bodyweight',
      value: weight(score.bodyweightKg, 'kg'),
      provenance: bodyweight ? `nearest entry, ${formatDayMonth(bodyweight.entry.recordedOn)}` : null,
    })
  }

  const kindLabel = strengthScoreKindLabels[score.kind]
  const formula = scoreFormula(score, sex)

  return {
    trace: {
      subject: `Strength score · ${kindLabel}`,
      context: scoreContext(score, sex),
      expression: formula.expression,
      substituted: formula.substituted,
      evaluated: formula.evaluated,
      result: formatScoreResult(score, units),
      inputs,
      matchesPlannedLoad: rederives(score, sex),
      overriddenFrom: null,
    },
    fallback: {
      steps: FALLBACK_ORDER.map((kind) => ({
        kind,
        label: strengthScoreKindLabels[kind],
        active: kind === score.kind,
      })),
      requirement: 'Needs a bodyweight entry and all three lifts in range.',
    },
    coefficients:
      score.kind === 'dots' && sex
        ? {
            sex,
            terms: COEFFICIENT_SYMBOLS.map((symbol, index) => ({
              symbol,
              value: DOTS_COEFFICIENTS[sex][index],
            })),
            clamp: DOTS_BW_CLAMP_KG[sex],
          }
        : null,
    bodyweightRecordedOn: bodyweight?.entry.recordedOn ?? null,
    bodyweightAgeDays: bodyweight?.ageDays ?? null,
  }
}

/** `formatWeight` is nullable for callers that may not have a load; here every value is present. */
function weight(value: number, units: Unit | string | null): string {
  return formatWeight(value, units) ?? '—'
}

/** "3 Aug · 122.5 × 3 @ RIR 2" — the set the estimate came off. */
function describeSet(point: LiftE1rmSeries['points'][number], units: Unit | null): string {
  const set = `${weight(point.load, units)} × ${point.reps}`
  const rir = point.rir === null ? '' : ` @ RIR ${point.rir}`
  return `${formatDayMonth(point.date)} · ${set}${rir}`
}

function scoreContext(score: StrengthScore, sex: Sex | null): string {
  const asOf = score.asOfDate ? `As of ${formatWeekdayShortDate(score.asOfDate)}` : 'As of your latest session'
  return score.kind === 'dots' && sex ? `${asOf} · ${sex} coefficients` : asOf
}

function formatScoreResult(score: StrengthScore, units: Unit | null): string {
  if (score.value === null) return '—'
  if (score.kind === 'dots') return `${score.value} points`
  if (score.kind === 'bw_multiple') return `${score.value} × bodyweight`
  return weight(score.value, units)
}

/**
 * The three lines of the formula block.
 *
 * `evaluated` is filled wherever there is a reducible step left, because `LoadTracePanel` prints
 * `substituted` twice when it is null.
 */
function scoreFormula(score: StrengthScore, sex: Sex | null) {
  const totalKg = score.totalKg
  const bw = score.bodyweightKg

  if (score.kind === 'dots' && sex && totalKg !== null && bw !== null) {
    const [min, max] = DOTS_BW_CLAMP_KG[sex]
    const clamped = Math.min(max, Math.max(min, bw))
    const [a, b, c, d, e] = DOTS_COEFFICIENTS[sex]
    const denominator = a + b * clamped + c * clamped ** 2 + d * clamped ** 3 + e * clamped ** 4
    return {
      expression: 'DOTS = total × 500 ÷ (a + b·bw + c·bw² + d·bw³ + e·bw⁴)',
      substituted: `= ${round(totalKg)} × 500 ÷ (a + b·${round(clamped)} + c·${round(clamped)}² + d·${round(clamped)}³ + e·${round(clamped)}⁴)`,
      evaluated: `= ${round(totalKg)} × 500 ÷ ${round(denominator, 2)}`,
    }
  }

  if (score.kind === 'bw_multiple' && totalKg !== null && bw !== null) {
    return {
      expression: '× bodyweight = total ÷ bodyweight',
      substituted: `= ${round(totalKg)} ÷ ${round(bw)}`,
      evaluated: null,
    }
  }

  return {
    expression: 'Total = squat + bench + deadlift',
    substituted: totalKg === null ? 'Total = squat + bench + deadlift' : `= ${round(totalKg)} kg`,
    evaluated: null,
  }
}

/** Re-derive the score from its own inputs; a trace that contradicts the number beside it says so. */
function rederives(score: StrengthScore, sex: Sex | null): boolean {
  if (score.totalKg === null || score.value === null) return true
  if (score.kind === 'dots') {
    if (!sex || score.bodyweightKg === null) return false
    return Math.abs(dotsScore(score.totalKg, score.bodyweightKg, sex) - score.value) < 0.05
  }
  if (score.kind === 'bw_multiple') {
    if (score.bodyweightKg === null) return false
    return Math.abs(bodyweightMultiple(score.totalKg, score.bodyweightKg) - score.value) < 0.005
  }
  return true
}

function round(value: number, places = 1): number {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}
