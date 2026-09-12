import { formatCompactDate } from '@sheetless/domain/shared/dates'
import { BODY_LOAD_FULL_SCORE } from '@sheetless/domain/history/body-load'
import type { LoadTrace, TraceInput } from '@sheetless/domain/program/load-trace'
import type { BodyLoadContribution, BodyLoadRegion } from '@sheetless/domain/history/types'

/**
 * Why a muscle group reads at the percentage it does.
 *
 * Returns the same `LoadTrace` shape the planned-load and e1RM traces use, so `LoadTracePanel`
 * renders it without knowing the difference.
 *
 * This is the only place the `÷ 12` divisor is stated to a user. `impactPercent` is
 * `score / BODY_LOAD_FULL_SCORE`, and until now that constant appeared in no copy anywhere — the
 * screen showed a percentage with no way to find out what it was a percentage of.
 */
export function buildBodyLoadTrace({
  region,
  windowDays,
}: {
  region: BodyLoadRegion
  windowDays: number
}): LoadTrace {
  const expression = `impact = Σ(sets × role × recency × muscle share) ÷ ${BODY_LOAD_FULL_SCORE}`
  const subject = `${region.label} · ${region.impactPercent}% worked`
  const context = `Last ${windowDays} days · ${region.recentSetCount} set${
    region.recentSetCount === 1 ? '' : 's'
  } involved this muscle`

  if (!region.contributions.length) {
    // Presenting "0 ÷ 12" would dress an absence up as a calculation.
    return {
      subject,
      context: `Last ${windowDays} days`,
      expression,
      substituted: 'no completed sets in the window',
      evaluated: null,
      result: '0%',
      inputs: [{ label: 'sets', value: '0', provenance: 'nothing logged for this muscle yet' }],
      matchesPlannedLoad: region.impactPercent === 0,
      overriddenFrom: null,
    }
  }

  const shownSum = roundTwo(region.contributions.reduce((sum, entry) => sum + entry.score, 0))
  const hiddenCount = region.contributionCount - region.contributions.length
  // The list is capped, so the visible rows can fall short of the score. Show the shortfall as its
  // own term rather than letting the reader watch four numbers fail to reach the total.
  const remainder = roundTwo(region.score - shownSum)

  const terms = region.contributions.map((entry) => traceNumber(entry.score))
  if (hiddenCount > 0 && remainder > 0) terms.push(traceNumber(remainder))

  const inputs: TraceInput[] = region.contributions.map(toInput(region.label))
  if (hiddenCount > 0) {
    inputs.push({
      label: `+${hiddenCount} more session${hiddenCount === 1 ? '' : 's'}`,
      value: traceNumber(remainder),
      provenance: 'smaller contributions, not listed individually',
    })
  }

  return {
    subject,
    context,
    expression,
    substituted: `= (${terms.join(' + ')}) ÷ ${BODY_LOAD_FULL_SCORE}`,
    evaluated: `= ${traceNumber(region.score)} ÷ ${BODY_LOAD_FULL_SCORE}`,
    result: `${region.impactPercent}%`,
    inputs,
    // Self-derived, so this only trips if the payload's own score and percentage disagree.
    matchesPlannedLoad: impactFor(region.score) === region.impactPercent,
    overriddenFrom: null,
  }
}

function toInput(regionLabel: string) {
  return (entry: BodyLoadContribution): TraceInput => ({
    label: entry.performedAt
      ? `${entry.movementName} · ${formatCompactDate(entry.performedAt)}`
      : entry.movementName,
    value: traceNumber(entry.score),
    provenance: `${entry.sets} set${entry.sets === 1 ? '' : 's'} × ${entry.role} ${traceNumber(
      entry.roleWeight,
    )} × recency ${traceNumber(entry.recencyWeight)} × ${regionLabel.toLowerCase()} ${traceNumber(
      entry.regionWeight,
    )}`,
  })
}

/** The same clamp `calculateBodyLoad` applies, asked rather than restated. */
function impactFor(score: number) {
  return Math.min(100, Math.max(0, Math.round((score / BODY_LOAD_FULL_SCORE) * 100)))
}

/** Formula numbers print at full precision — a trace that rounds its own workings is not a trace. */
function traceNumber(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return String(Number(value.toFixed(4)))
}

function roundTwo(value: number) {
  return Math.round(value * 100) / 100
}
