import type { ProgressionDecision } from '@sheetless/domain/program/types'
import { reviewDecisionView } from '@sheetless/domain/program/progression-review'
import type { Unit } from '@sheetless/domain/shared/types'

/** Describe the recorded rule without inferring missing effort or a calendar date. */
export function recapProgressionReason(decision: ProgressionDecision) {
  switch (decision.ruleId) {
    case 'simple_linear_completion': return 'All required sets met their rep targets and the programme’s completion rule.'
    case 'training_max_reset': return 'At least one cycle top set fell short of its rep target.'
    case 'training_max_hold': return 'This rule holds the training max when a cycle top set has low or unrecorded reps in reserve.'
    case 'training_max_standard': return 'The cycle’s top sets met their rep targets and qualified for the standard increase.'
    case 'training_max_double': return 'The cycle’s top sets exceeded their targets by at least two reps, with at least two reps in reserve recorded.'
    case 'plus_set_wave': return 'This recommendation uses the extra reps recorded above the plus-set baseline.'
    case 'accessory_double_progression': return 'This recommendation uses the recorded reps against the programme’s rep range.'
    default: return 'This is the saved recommendation for this workout.'
  }
}

export function recapDecisionView(decision: ProgressionDecision, units: Unit) {
  const view = reviewDecisionView(decision, units)
  const direction = !view.isNumeric ? 'Recommendation' : view.delta === 0 ? 'Hold' : view.delta! < 0 ? 'Reduction' : 'Increase'
  const status = decision.status
  const label = status === 'pending' ? `${direction} proposed` : status === 'accepted' ? `${direction} applied`
    : status === 'dismissed' ? 'Kept current value' : 'Superseded'
  const change = status === 'superseded' ? 'Later programme changes replaced this recommendation.'
    : status === 'dismissed' ? view.isNumeric ? `Kept at ${view.currentLabel}` : 'Kept the previous plan.'
      : view.isNumeric ? view.delta === 0 ? `Hold at ${view.currentLabel}` : `${view.currentLabel} → ${view.nextLabel}`
        : decision.recommendation
  return { ...view, label, change, reason: recapProgressionReason(decision),
    tone: status === 'accepted' && view.delta !== null && view.delta > 0 ? 'success' as const
      : view.delta !== null && view.delta < 0 && status !== 'dismissed' && status !== 'superseded' ? 'warning' as const : 'neutral' as const }
}
