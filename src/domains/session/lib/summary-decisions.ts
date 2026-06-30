import type { ProgressionDecision, Unit } from '~/shared/types'
import { formatWeight } from '~/shared/lib/set-notation'

/**
 * Display model for the Session Summary v2 "decision hero" — turns a progression decision into a
 * `from → to (+delta)` load update, or falls back to its recommendation text when the decision carries
 * no numeric loads (e.g. accessory autoregulation). Pure + testable.
 */
export type DecisionUpdate = {
  id: string
  name: string
  isNumeric: boolean
  fromLabel: string | null
  toLabel: string | null
  deltaLabel: string | null
  delta: number | null
  recommendation: string
}

function formatDelta(value: number): string {
  const rounded = Math.round(value * 10) / 10
  const body = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(/\.0$/, '')
  return rounded > 0 ? `+${body}` : body
}

export function decisionUpdate(decision: ProgressionDecision, units: Unit | string): DecisionUpdate {
  const { id, movementName, previousValue, recommendedValue, recommendation } = decision
  const isNumeric =
    typeof previousValue === 'number' &&
    Number.isFinite(previousValue) &&
    typeof recommendedValue === 'number' &&
    Number.isFinite(recommendedValue)

  if (!isNumeric) {
    return { id, name: movementName, isNumeric: false, fromLabel: null, toLabel: null, deltaLabel: null, delta: null, recommendation }
  }

  const delta = (recommendedValue as number) - (previousValue as number)
  return {
    id,
    name: movementName,
    isNumeric: true,
    fromLabel: formatWeight(previousValue as number, units),
    toLabel: formatWeight(recommendedValue as number, units),
    deltaLabel: delta === 0 ? null : formatDelta(delta),
    delta,
    recommendation,
  }
}

/** A small positive headline for the title row. */
export function summaryHeadline(completedSets: number, totalSets: number): string {
  return totalSets > 0 && completedSets >= totalSets ? 'Strong session, all logged' : 'Session logged'
}

export type UpdatesStatTone = 'warning' | 'success' | 'neutral'

/** The "Updates" stat tile: pending (amber) → applied (green) → neutral. */
export function updatesStat(pendingCount: number, appliedCount: number): { value: string; tone: UpdatesStatTone } {
  if (pendingCount > 0) return { value: `${pendingCount} pending`, tone: 'warning' }
  if (appliedCount > 0) return { value: `${appliedCount} applied`, tone: 'success' }
  return { value: '0', tone: 'neutral' }
}
