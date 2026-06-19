// Timezone-safe "what is today". See docs/Ultimate-workout-plan.md §7.
// Sessions are SUGGESTED by the local weekday; the cycle pointer is advanced
// explicitly by the user finishing hard sessions (never by wall-clock).

import type { LiftId, SessionType } from './types'
import { WEEKLY_SCHEDULE } from './program-config'
import { WEEK_COUNT } from './cycle'

/** localDow: 0=Sunday … 6=Saturday (matches Date.prototype.getDay()). */
export function sessionForWeekday(localDow: number): SessionType {
  return WEEKLY_SCHEDULE[localDow] ?? 'rest'
}

/** The three hard barbell lifts map to a LiftId; everything else is non-lift. */
export function liftForSession(session: SessionType): LiftId | null {
  if (session === 'squat' || session === 'bench' || session === 'deadlift') return session
  return null
}

export function isDeloadWeek(weekIndex: number): boolean {
  return weekIndex === WEEK_COUNT - 1
}

/** Advance the (cycleIndex, weekIndex) pointer by one completed week. */
export function advanceWeek(cycleIndex: number, weekIndex: number): {
  cycleIndex: number
  weekIndex: number
} {
  const next = weekIndex + 1
  if (next >= WEEK_COUNT) return { cycleIndex: cycleIndex + 1, weekIndex: 0 }
  return { cycleIndex, weekIndex: next }
}
