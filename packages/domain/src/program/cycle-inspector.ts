import type { MovementRole } from '@sheetless/domain/shared/types'
import type {
  ProgressionDecision,
  ProgramStateOverview,
  TemplateDefinition,
} from '@sheetless/domain/program/types'

/**
 * What is governing this cycle, for the Full-mode inspector on Plan.
 *
 * Every field here is read from something that already decides behaviour — the per-prescription
 * `progressionRuleId`, and the `scope` a decision actually carried. Nothing is restated, so nothing
 * can drift from the rules that really run.
 */
export type CycleRule = {
  ruleId: string
  /** Which roles the rule governs, in template order: "main lifts", "accessories". */
  roles: string
  /**
   * `session` | `week` | `wave` | `cycle` | `block`, read from a decision this rule produced.
   * Null until one has been seen — scope is fixed at evaluation time, not declared on the
   * template, so inventing it here would be a guess.
   */
  scope: ProgressionDecision['scope'] | null
}

export type CycleProjection = {
  movementId: string
  label: string
  current: number
  /** The heaviest planned top-set load in the phase ahead — not a projected training max. */
  projected: number | null
}

export type CycleInspectorModel = {
  /** "Week 3 of 4" */
  position: string
  /** When the cycle's decisions get written. */
  decisionNote: string
  rules: CycleRule[]
  projections: CycleProjection[]
}

const ROLE_LABELS: Record<MovementRole, string> = {
  main: 'main lifts',
  variation: 'variations',
  accessory: 'accessories',
  warmup: 'warm-ups',
  event: 'events',
}

/**
 * Collect the rules actually in play.
 *
 * `TemplateDefinition.progressionRules` looks like the answer but is a decorative role-keyed
 * summary that nothing in the codebase reads. The rule that runs is the one on each week's
 * prescription, reached through the slot's `prescriptionId` — the same join
 * `buildProgramTrajectory` and `buildProgramTimelineFromDefinition` already use.
 */
export function collectCycleRules(
  definition: TemplateDefinition,
  decisions: ProgressionDecision[],
): CycleRule[] {
  const rolesByRule = new Map<string, Set<MovementRole>>()

  for (const week of definition.weeks) {
    for (const session of definition.sessions) {
      for (const slot of session.slots) {
        const ruleId = week.prescriptions[slot.prescriptionId]?.progressionRuleId
        if (!ruleId) continue
        const roles = rolesByRule.get(ruleId) ?? new Set<MovementRole>()
        roles.add(slot.role)
        rolesByRule.set(ruleId, roles)
      }
    }
  }

  const scopeFor = (ruleId: string) =>
    decisions.find((decision) => sameRuleFamily(decision.ruleId, ruleId))?.scope ?? null

  return [...rolesByRule.entries()]
    .map(([ruleId, roles]) => ({
      ruleId,
      roles: [...roles].map((role) => ROLE_LABELS[role]).join(', '),
      scope: scopeFor(ruleId),
    }))
    .sort((left, right) => left.ruleId.localeCompare(right.ruleId))
}

/**
 * Whether a decision's rule id belongs to a template rule.
 *
 * They are often siblings rather than equal: a slot declares `training_max_band`, and the decision
 * it produces is `training_max_standard` / `_double` / `_hold` / `_reset` (`progression.ts:106`).
 * Two ids are the same family when they agree on their first two segments, which keeps
 * `training_max_*` together without collapsing `accessory_double_progression` into it.
 */
function sameRuleFamily(left: string, right: string): boolean {
  if (left === right) return true
  const leftParts = left.split('_')
  const rightParts = right.split('_')
  if (leftParts.length < 3 || rightParts.length < 3) return false
  return leftParts[0] === rightParts[0] && leftParts[1] === rightParts[1]
}

export function buildCycleInspector({
  definition,
  weekNumber,
  totalWeeks,
  stateValues,
  decisions,
  projectedByMovement,
}: {
  definition: TemplateDefinition
  weekNumber: number
  totalWeeks: number
  stateValues: ProgramStateOverview[]
  /** Pending and accepted decisions together — only their `scope` is read. */
  decisions: ProgressionDecision[]
  /** Heaviest upcoming top-set load per movement, from the trajectory's projection. */
  projectedByMovement?: Record<string, number>
}): CycleInspectorModel {
  const rules = collectCycleRules(definition, decisions)

  const projections = stateValues.map((state) => ({
    movementId: state.movementId,
    label: state.movementName,
    current: state.value,
    projected: projectedByMovement?.[state.movementId] ?? null,
  }))

  return {
    position: `Week ${weekNumber} of ${totalWeeks}`,
    decisionNote:
      weekNumber >= totalWeeks
        ? 'Decisions are written as this week closes.'
        : `Decisions are written when week ${totalWeeks} closes.`,
    rules,
    projections,
  }
}
