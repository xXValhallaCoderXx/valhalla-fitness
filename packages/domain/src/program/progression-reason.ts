import type { ProgressionDecision } from '@sheetless/domain/program/types'
import type { Unit } from '@sheetless/domain/shared/types'
import { formatNumber } from '@sheetless/domain/shared/set-notation'

/**
 * Plain-language "why" for a progression, re-derived rather than read back.
 *
 * `ProgressionDecision.rationale` is written at finish time but never persisted — the receipts
 * schema stores only `input_summary` and `recommendation`, so a decision read from the database
 * degrades to "Bench Press cycle top sets evaluated as standard.". Everything the sentence needs
 * *is* persisted (`ruleId`, `previousValue`, `recommendedValue`), so this rebuilds it.
 *
 * Keep the wording in step with the rationale strings in `progression.ts`; those remain the voice
 * of record for a decision that still has its own.
 */

/** The clause after the delta: why the weight moved. Present tense, no movement name. */
const reasonByRuleId: Record<string, string> = {
  training_max_reset: "the reps weren't there, so it rebuilds safely",
  training_max_hold: 'your last set was very hard',
  training_max_standard: 'you got every rep last time',
  training_max_double: 'you beat the target with reps to spare',
  simple_linear_completion: 'you completed every set',
  accessory_double_progression: 'you topped the rep range',
}

/** The full coaching sentence, matching the `rationale` each rule writes at finish time. */
const rationaleByRuleId: Record<string, string> = {
  training_max_reset: 'You missed target reps, so Sheetless backs the weight off to rebuild it safely.',
  training_max_hold: 'Your last set was very hard (about 1 rep left), so Sheetless holds the weight to let you own it.',
  training_max_standard: 'You beat the target with good effort, so Sheetless progresses the lift.',
  training_max_double: 'You beat the target by 2+ reps with reps to spare, so Sheetless makes a bigger jump.',
  simple_linear_completion: 'You completed every set at the target reps and effort, so Sheetless adds a small increase.',
  accessory_double_progression: 'Every set reached the top of the rep range, so Sheetless adds load.',
}

function decisionDelta(decision: ProgressionDecision): number | null {
  const { previousValue, recommendedValue } = decision
  if (typeof previousValue !== 'number' || !Number.isFinite(previousValue)) return null
  if (typeof recommendedValue !== 'number' || !Number.isFinite(recommendedValue)) return null
  return recommendedValue - previousValue
}

/** "up 2.5 kg", "down 15 kg", "held" — null when the decision carries no numbers. */
export function progressionDeltaLabel(
  decision: ProgressionDecision,
  units?: Unit | string | null,
): string | null {
  const delta = decisionDelta(decision)
  if (delta === null) return null
  if (delta === 0) return 'held'
  const suffix = units ? ` ${units}` : ''
  return `${delta > 0 ? 'up' : 'down'} ${formatNumber(Math.abs(delta))}${suffix}`
}

/**
 * The Today row reason: "up 2.5 kg — you got every rep last time".
 *
 * Returns null rather than a placeholder when the rule is unknown or the decision carries no
 * numbers — a row with nothing honest to say shows no reason line at all.
 */
export function progressionReasonClause(
  decision: ProgressionDecision,
  units?: Unit | string | null,
): string | null {
  const reason = reasonByRuleId[decision.ruleId] ?? null
  const delta = progressionDeltaLabel(decision, units)
  if (!reason) return delta
  if (!delta) return reason.charAt(0).toUpperCase() + reason.slice(1)
  return `${delta} — ${reason}`
}

/**
 * The full coaching sentence. Prefers a decision's own `rationale` when it still has one (finish
 * time), then the re-derived sentence, then the persisted machine summary.
 */
export function progressionRationale(decision: ProgressionDecision): string {
  return (
    decision.rationale?.trim() ||
    rationaleByRuleId[decision.ruleId] ||
    decision.inputSummary.trim() ||
    decision.recommendation.trim()
  )
}
