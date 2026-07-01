import type { ProgramStateType, ProgressionDecision, Unit } from '~/shared/types'
import { formatWeight } from '~/shared/lib/set-notation'

/**
 * Display model for the Progression Review v2 modal — turns a decision into a "Now → Next block (+delta)"
 * view, or falls back to its recommendation text when there are no numeric loads (qualitative accessory
 * autoregulation). Pure + testable.
 */
export type ReviewDecisionView = {
  id: string
  name: string
  kindLabel: string | null
  isNumeric: boolean
  currentLabel: string | null
  nextLabel: string | null
  deltaLabel: string | null
  delta: number | null
  reason: string
}

export function progressionKindLabel(stateType: ProgramStateType | null | undefined): string | null {
  switch (stateType) {
    case 'training_max':
      return 'Training max'
    case 'working_load':
      return 'Working load'
    case 'one_rep_max':
      return '1RM'
    case 'five_rep_max':
      return '5RM'
    default:
      return null
  }
}

function formatDelta(value: number, units: Unit | string): string {
  const rounded = Math.round(value * 10) / 10
  const body = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(/\.0$/, '')
  return `${rounded > 0 ? '+' : ''}${body} ${units}`
}

export function reviewDecisionView(decision: ProgressionDecision, units: Unit | string): ReviewDecisionView {
  const { id, movementName, previousValue, recommendedValue, recommendation, rationale, stateType } = decision
  const reason = (rationale ?? recommendation) || ''
  const kindLabel = progressionKindLabel(stateType)
  const isNumeric =
    typeof previousValue === 'number' &&
    Number.isFinite(previousValue) &&
    typeof recommendedValue === 'number' &&
    Number.isFinite(recommendedValue)

  if (!isNumeric) {
    return { id, name: movementName, kindLabel, isNumeric: false, currentLabel: null, nextLabel: null, deltaLabel: null, delta: null, reason }
  }

  const delta = (recommendedValue as number) - (previousValue as number)
  return {
    id,
    name: movementName,
    kindLabel,
    isNumeric: true,
    currentLabel: formatWeight(previousValue as number, units),
    nextLabel: formatWeight(recommendedValue as number, units),
    deltaLabel: delta === 0 ? null : formatDelta(delta, units),
    delta,
    reason,
  }
}
