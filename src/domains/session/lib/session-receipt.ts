import type {
  MovementSlot,
  ProgressionDecision,
  SessionSummary,
  SetLog,
  Unit,
  WorkoutSession,
} from '~/shared/types'
import { describeSet, formatWeight, type SetNotation } from '~/shared/lib/set-notation'

export type ReceiptTone = 'success' | 'neutral' | 'warning'

/**
 * One plain-language line of the post-session coaching receipt: what Sheetless
 * learned, what it changes next time, and why.
 */
export type ReceiptEntry = {
  movementName: string
  learned: string
  change: string
  why: string
  tone: ReceiptTone
}

export type MovementPerformance = {
  goal: string
  didReps: number[]
  result: string
  bestSet: SetNotation | null
}

function isSubstituted(movement: MovementSlot) {
  return Boolean(movement.performedMovementId) && movement.performedMovementId !== movement.movementId
}

function keySet(movement: MovementSlot): SetLog | undefined {
  return movement.sets.find((set) => set.isTopSet || set.isAmrap) ?? movement.sets.at(-1)
}

function repTargetLabel(set: SetLog | undefined) {
  if (!set) return 'your target'
  if (set.targetReps != null) return `${set.targetReps}${set.isAmrap ? '+' : ''} reps`
  if (set.targetRepMin != null && set.targetRepMax != null) return `${set.targetRepMin}-${set.targetRepMax} reps`
  if (set.targetRepMin != null) return `${set.targetRepMin}+ reps`
  return 'your target'
}

/** Goal / what you did / result / best set — used in the per-movement summary. */
export function summarizeMovementPerformance(movement: MovementSlot, units?: Unit | string): MovementPerformance {
  const sets = movement.sets
  const completed = sets.filter((set) => set.completed)
  const didReps = completed.map((set) => set.actualReps ?? 0)
  const goal = `${sets.length} ${sets.length === 1 ? 'set' : 'sets'} of ${repTargetLabel(sets[0])}`

  const top = keySet(movement)
  const bestSet = top ? describeSet(top, units) : null

  let result: string
  if (completed.length < sets.length) {
    result = `Logged ${completed.length} of ${sets.length} sets`
  } else {
    const target = top?.targetReps ?? top?.targetRepMin ?? null
    const best = Math.max(0, ...didReps)
    if (target != null && best > target) result = 'Beat the target on your best set'
    else if (target == null || best >= target) result = 'Hit every target'
    else result = 'Came up a little short on reps'
  }

  return { goal, didReps, result, bestSet }
}

/**
 * The "next time" line. When the decision carries numbers (main lifts), show the
 * concrete current → next load; otherwise keep the qualitative cue (accessories
 * don't get a target load from the engine).
 */
function describeDecisionChange(decision: ProgressionDecision, units?: Unit | string): string {
  const { previousValue, recommendedValue } = decision
  if (previousValue != null && recommendedValue != null) {
    if (previousValue === recommendedValue) return `Hold at ${formatWeight(previousValue, units)}`
    return `${formatWeight(previousValue, units)} → ${formatWeight(recommendedValue, units)}`
  }
  if (decision.recommendation === 'Add load next time') return 'Add a little weight next time'
  return decision.recommendation
}

function decisionTone(decision: ProgressionDecision): ReceiptTone {
  if (decision.previousValue != null && decision.recommendedValue != null) {
    if (decision.recommendedValue > decision.previousValue) return 'success'
    if (decision.recommendedValue < decision.previousValue) return 'warning'
    return 'neutral'
  }
  if (decision.ruleId.includes('reset')) return 'warning'
  if (decision.recommendation.toLowerCase().includes('add load')) return 'success'
  return 'neutral'
}

/**
 * Build the coaching receipt for a finished session: progression decisions
 * (with their "why"), plus reassurance for missed, substituted, and partial
 * work — so an imperfect session still reads as useful data, not failure.
 */
export function buildSessionReceipt(session: WorkoutSession, summary?: SessionSummary): ReceiptEntry[] {
  const units = session.units
  const entries: ReceiptEntry[] = []
  const decisions = summary?.decisions ?? []
  const decisionByMovement = new Map(decisions.map((decision) => [decision.movementId, decision]))

  // 1. Decision-backed entries — the actionable progressions, carrying rationale.
  for (const movement of session.movements) {
    const decision = decisionByMovement.get(movement.movementId)
    if (!decision) continue
    const performance = summarizeMovementPerformance(movement, units)
    entries.push({
      movementName: decision.movementName,
      learned: performance.bestSet ? `Best set ${performance.bestSet.plain}. ${decision.inputSummary}` : decision.inputSummary,
      change: describeDecisionChange(decision, units),
      why: decision.rationale ?? '',
      tone: decisionTone(decision),
    })
  }

  // 2. Main lifts that came up short with no decision generated.
  for (const movement of session.movements) {
    if (movement.role !== 'main') continue
    if (decisionByMovement.has(movement.movementId) || isSubstituted(movement)) continue
    const key = keySet(movement)
    const target = key?.targetReps ?? key?.targetRepMin ?? null
    if (key?.completed && target != null && (key.actualReps ?? 0) < target) {
      entries.push({
        movementName: movement.movementName,
        learned: `You got ${key.actualReps} reps when the target was ${target}+.`,
        change: 'Sheetless will repeat this weight next time.',
        why: 'Repeating gives you another chance to own the weight before moving up.',
        tone: 'neutral',
      })
    }
  }

  // 3. Substitutions — any swapped movement.
  for (const movement of session.movements) {
    if (!isSubstituted(movement)) continue
    entries.push({
      movementName: movement.performedMovementName ?? movement.movementName,
      learned: `You swapped ${movement.movementName} for ${movement.performedMovementName}.`,
      change: 'Sheetless counted it as similar work for the same muscles.',
      why: 'Swaps keep your training honest without breaking the plan.',
      tone: 'neutral',
    })
  }

  // 4. Partial session — reassurance at the session level.
  const allSets = session.movements.flatMap((movement) => movement.sets)
  const completedCount = allSets.filter((set) => set.completed).length
  if (allSets.length > 0 && completedCount < allSets.length) {
    entries.push({
      movementName: 'This session',
      learned: `You completed ${completedCount} of ${allSets.length} planned sets.`,
      change: 'Sheetless will avoid aggressive changes based on this session.',
      why: 'Partial sessions still count — honest logging keeps your next workout sensible.',
      tone: 'warning',
    })
  }

  return entries
}
