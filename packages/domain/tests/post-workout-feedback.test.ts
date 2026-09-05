import { describe, expect, it } from 'vitest'
import { accountSessionFeedbackStorageKey, postWorkoutFeedbackEligible } from '../src/feedback/post-workout'
import type { SessionSummary, WorkoutSession } from '../src/session/types'

const session = { sessionId: 's1', status: 'completed', isAdHoc: false, units: 'kg', movements: [] } as unknown as WorkoutSession
const summary = { session, decisions: [{ id: 'd1' }] } as unknown as SessionSummary

describe('post-workout feedback eligibility', () => {
  it('requires a matching fresh programme finish with decision or coaching context', () => {
    expect(postWorkoutFeedbackEligible(session, summary)).toBe(true)
    expect(postWorkoutFeedbackEligible(session)).toBe(false)
    expect(postWorkoutFeedbackEligible({ ...session, isAdHoc: true }, summary)).toBe(false)
    expect(postWorkoutFeedbackEligible({ ...session, status: 'in_progress' }, summary)).toBe(false)
    expect(postWorkoutFeedbackEligible({ ...session, sessionId: 'other' }, summary)).toBe(false)
    expect(postWorkoutFeedbackEligible(session, { ...summary, decisions: [] })).toBe(false)
  })
  it('permits a coaching receipt without a decision, and scopes handled markers by account and session', () => {
    const partial = { ...session, movements: [{ movementId: 'squat', movementName: 'Squat', role: 'main', sets: [{ completed: false }] }] } as WorkoutSession
    expect(postWorkoutFeedbackEligible(partial, { ...summary, session: partial, decisions: [] })).toBe(true)
    expect(accountSessionFeedbackStorageKey('a', 's')).not.toBe(accountSessionFeedbackStorageKey('b', 's'))
    expect(accountSessionFeedbackStorageKey('a', 's')).not.toBe(accountSessionFeedbackStorageKey('a', 't'))
  })
})
