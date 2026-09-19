import type { ProgressionDecision } from '@sheetless/domain/program/types'
import type { Unit } from '@sheetless/domain/shared/types'
import { formatWeight } from '@sheetless/domain/shared/set-notation'

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

/** Describe the actual pending directions; never infer that targets were met. */
export function pendingDecisionCopy(decisions: ProgressionDecision[]) {
  const directions = new Set(decisions.map((decision) => {
    const delta = decisionUpdate(decision, 'kg').delta
    return delta == null ? 'qualitative' : delta > 0 ? 'increase' : delta < 0 ? 'reduction' : 'hold'
  }))
  const direction = directions.size === 1 ? [...directions][0] : 'mixed'
  const body = direction === 'increase' ? 'These recommendations increase your planned values.'
    : direction === 'reduction' ? 'These recommendations reduce your planned values.'
      : direction === 'hold' ? 'These recommendations keep your current values.'
        : direction === 'mixed' && !directions.has('qualitative') && decisions.length > 0
          ? 'Your recommendations include different changes. Review each one below.'
          : 'Review each recommendation and its reason below.'
  return {
    heading: `${decisions.length} recommendation${decisions.length === 1 ? '' : 's'} ready`,
    body,
  }
}
