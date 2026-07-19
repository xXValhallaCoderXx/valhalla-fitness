import type { ProgressionDecision } from '~/shared/types'

export type FeedbackSource = (typeof FEEDBACK_SOURCES)[number]
export type FeedbackAnswer = (typeof FEEDBACK_ANSWERS)[number]
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]

export const FEEDBACK_SOURCES = ['post_workout', 'decision', 'menu'] as const

/** Micro-answer to "Did Sheetless explain your next workout clearly?" */
export const FEEDBACK_ANSWERS = ['yes', 'no', 'not_sure'] as const

/** Single source of truth mirroring the `feedback_events.category` CHECK constraint. */
export const FEEDBACK_CATEGORIES = [
  // post-workout reasons
  'next_weight_wrong',
  'explanation_unclear',
  'expected_deload',
  'expected_same_weight',
  'changed_workout_manually',
  // decision reasons
  'should_increase',
  'should_stay',
  'should_decrease',
  'reps_sets_wrong',
  'rule_unclear',
  // menu categories
  'bug',
  'progression',
  'confusing_screen',
  'feature_request',
  'general',
  // shared
  'other',
] as const

export const FEEDBACK_MESSAGE_MAX = 2000

export type SubmitFeedbackInput = {
  source: FeedbackSource
  answer?: FeedbackAnswer | null
  category?: FeedbackCategory | null
  message?: string | null
  route?: string | null
  sessionId?: string | null
  decisionId?: string | null
  metadata?: Record<string, unknown>
}

export type FeedbackOption = { value: FeedbackCategory; label: string }

/** Pills for the post-workout micro-question. */
export const postWorkoutAnswerOptions: Array<{ value: FeedbackAnswer; label: string }> = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'not_sure', label: 'Not sure' },
]

/** Follow-up reasons when the post-workout answer is "No" / "Not sure". */
export const postWorkoutReasonOptions: FeedbackOption[] = [
  { value: 'next_weight_wrong', label: 'The next weight felt wrong' },
  { value: 'explanation_unclear', label: 'The explanation was unclear' },
  { value: 'expected_deload', label: 'I expected a deload' },
  { value: 'expected_same_weight', label: 'I expected the same weight' },
  { value: 'changed_workout_manually', label: 'I changed the workout manually' },
  { value: 'other', label: 'Other' },
]

/** "Something off?" reasons for a specific progression decision. */
export const decisionReasonOptions: FeedbackOption[] = [
  { value: 'should_increase', label: 'Weight should increase' },
  { value: 'should_stay', label: 'Weight should stay the same' },
  { value: 'should_decrease', label: 'Weight should decrease' },
  { value: 'reps_sets_wrong', label: 'Reps or sets seem wrong' },
  { value: 'rule_unclear', label: "I don't understand the rule" },
  { value: 'other', label: 'Other' },
]

/** Global "Beta feedback" categories in the account menu. */
export const menuCategoryOptions: FeedbackOption[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'progression', label: 'Progression issue' },
  { value: 'confusing_screen', label: 'Confusing screen' },
  { value: 'feature_request', label: 'Feature request' },
  { value: 'general', label: 'General note' },
]

function normalizeText(value: string | null | undefined, max = FEEDBACK_MESSAGE_MAX): string | null {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

/**
 * Trim/normalize a submission and hard-guard enum values so bad input becomes a
 * clean Error instead of a Postgres CHECK violation. The DB constraints stay the
 * final word; this keeps error messages readable.
 */
export function normalizeFeedbackInput(input: SubmitFeedbackInput): SubmitFeedbackInput {
  if (!FEEDBACK_SOURCES.includes(input.source)) {
    throw new Error(`Unknown feedback source: ${String(input.source)}`)
  }
  const answer = input.answer ?? null
  if (answer !== null) {
    if (!FEEDBACK_ANSWERS.includes(answer)) throw new Error(`Unknown feedback answer: ${String(answer)}`)
    if (input.source !== 'post_workout') throw new Error('Feedback answers only apply to the post-workout prompt')
  }
  const category = input.category ?? null
  if (category !== null && !FEEDBACK_CATEGORIES.includes(category)) {
    throw new Error(`Unknown feedback category: ${String(category)}`)
  }
  const message = normalizeText(input.message)
  if (answer === null && category === null && message === null) {
    throw new Error('Feedback needs an answer, a category, or a message')
  }
  const metadata = input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata) ? input.metadata : {}
  return {
    source: input.source,
    answer,
    category,
    message,
    route: normalizeText(input.route, 300),
    sessionId: input.sessionId?.trim() || null,
    decisionId: input.decisionId?.trim() || null,
    metadata,
  }
}

/**
 * Snapshot of the exact decision the user is questioning — the rule and numbers
 * that make a "felt wrong" analyzable later.
 */
export function buildDecisionFeedbackInput(
  decision: ProgressionDecision,
  extras: { category: FeedbackCategory; message?: string | null; route?: string | null; sessionId?: string | null },
): SubmitFeedbackInput {
  const metadata: Record<string, unknown> = {
    ruleId: decision.ruleId,
    movementId: decision.movementId,
    movementName: decision.movementName,
    scope: decision.scope,
    decisionStatus: decision.status,
    recommendation: decision.recommendation,
  }
  if (decision.stateType != null) metadata.stateType = decision.stateType
  if (decision.previousValue != null) metadata.previousValue = decision.previousValue
  if (decision.recommendedValue != null) metadata.recommendedValue = decision.recommendedValue
  return {
    source: 'decision',
    category: extras.category,
    message: extras.message ?? null,
    route: extras.route ?? null,
    sessionId: extras.sessionId ?? null,
    decisionId: decision.id,
    metadata,
  }
}

/** localStorage key marking the post-workout prompt as answered/dismissed for a session. */
export function sessionFeedbackStorageKey(sessionId: string) {
  return `sheetless.feedback.session.${sessionId}`
}
