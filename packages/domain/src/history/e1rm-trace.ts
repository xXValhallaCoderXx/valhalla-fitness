import { e1rm } from '@sheetless/domain/shared/math'
import { formatCompactDate } from '@sheetless/domain/shared/dates'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import type { LoadTrace } from '@sheetless/domain/program/load-trace'
import type { E1rmPoint } from '@sheetless/domain/history/types'

/**
 * Where an estimated one-rep max came from.
 *
 * Returns the same `LoadTrace` shape the planned-load trace uses, so `LoadTracePanel` renders it
 * without knowing the difference — the panel was built to take more than one kind of derivation.
 */
export function buildE1rmTrace({
  point,
  movementName,
  units,
}: {
  point: E1rmPoint
  movementName: string
  units: string
}): LoadTrace {
  // `e1rm` clamps a negative or missing RIR to 0. A set logged without an effort rating is
  // therefore estimated as if taken to failure, which understates it — say so rather than let the
  // arithmetic imply a rating that was never given.
  const rirGiven = typeof point.rir === 'number'
  const rir = rirGiven ? Math.max(point.rir as number, 0) : 0
  const computed = e1rm(point.load, point.reps, rir)
  const rounded = Math.round(computed * 10) / 10
  const multiplier = Math.round((1 + (point.reps + rir) / 30) * 10000) / 10000

  return {
    subject: `Best e1RM · ${movementName}`,
    context: `${formatCompactDate(point.date)} · ${point.reps} reps${rirGiven ? ` at RIR ${point.rir}` : ''}`,
    expression: 'e1RM = load × (1 + (reps + RIR) ÷ 30)',
    substituted: `= ${point.load} × (1 + (${point.reps} + ${rir}) ÷ 30)`,
    evaluated: `= ${point.load} × ${multiplier}`,
    result: formatWeight(rounded, units) ?? '—',
    inputs: [
      { label: 'load', value: formatWeight(point.load, units) ?? '—', provenance: 'logged' },
      { label: 'reps', value: String(point.reps), provenance: 'logged' },
      {
        label: 'RIR',
        value: String(rir),
        provenance: rirGiven ? 'logged' : 'no effort logged — counted as 0',
      },
    ],
    // The point's own e1rm is rounded to 0.5 by buildLiftE1rmSeries; this re-derivation is exact,
    // so compare on the rounding the series actually applies.
    matchesPlannedLoad: Math.abs(point.e1rm - computed) < 0.5,
    overriddenFrom: null,
  }
}
