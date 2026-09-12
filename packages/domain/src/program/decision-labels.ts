import type { ExperienceMode } from '@sheetless/domain/account/types'
import type { ProgressionDecision } from '@sheetless/domain/program/types'
import { stateKeyLabel } from '@sheetless/domain/program/load-trace'

type ModeLabel = Record<ExperienceMode, string>
const label = (guided: string, full: string): ModeLabel => ({ guided, full })

/**
 * The progression receipt in both voices.
 *
 * Guided names the change and says why in the rule's own words; Full adds the rule id and the
 * inputs it read. `rationale` is shipped copy and is shown verbatim in both — the sentence is the
 * explanation, not a Guided-only simplification of one.
 */
export const decisionLabels = {
  heading: label('What changed', 'Progression decisions'),
  pendingHeading: label('Waiting on you', 'Pending decisions'),
  accept: label('Apply', 'Accept'),
  dismiss: label('Leave it', 'Dismiss'),
  emptyPending: label('Nothing to confirm right now.', 'No pending decisions.'),
  /** History opens the programme's ledger, not this session's — the schema records no link. */
  programmeScopeNote: label(
    'These are waiting on you across the whole programme, not just this workout.',
    'Programme-scoped: decisions are keyed to the programme instance, not to a session.',
  ),
} satisfies Record<string, ModeLabel>

export function decisionLabel(key: keyof typeof decisionLabels, mode: ExperienceMode): string {
  return decisionLabels[key][mode]
}

/** `TM_bench` in Full; the lift's own name in Guided. */
export function decisionSubject(decision: ProgressionDecision, mode: ExperienceMode): string {
  if (mode === 'guided' || !decision.stateKey || !decision.stateType) return decision.movementName
  return stateKeyLabel(decision.stateKey, decision.stateType)
}

/** How wide a decision reaches: one session, or the whole cycle. */
export const decisionScopeLabels: Record<ProgressionDecision['scope'], ModeLabel> = {
  session: label('after this workout', 'session scope'),
  week: label('at the end of the week', 'week scope'),
  wave: label('at the end of the wave', 'wave scope'),
  cycle: label('at the end of the cycle', 'cycle scope'),
  block: label('at the end of the block', 'block scope'),
}

export function decisionScopeLabel(decision: ProgressionDecision, mode: ExperienceMode): string {
  return decisionScopeLabels[decision.scope][mode]
}
