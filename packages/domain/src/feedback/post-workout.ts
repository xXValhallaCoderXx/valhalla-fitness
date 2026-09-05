import type { SessionSummary, WorkoutSession } from '../session/types'
import { buildSessionReceipt } from '../session/session-receipt'

export function postWorkoutFeedbackEligible(session: WorkoutSession, summary?: SessionSummary) {
  return Boolean(summary && summary.session.sessionId === session.sessionId && session.status === 'completed' &&
    !session.isAdHoc && (summary.decisions.length > 0 || buildSessionReceipt(session, summary).length > 0))
}

export function accountSessionFeedbackStorageKey(accountId: string, sessionId: string) {
  return `sheetless.feedback.account.${accountId}.session.${sessionId}`
}
