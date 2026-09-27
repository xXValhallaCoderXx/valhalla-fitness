import { calendarDayDifference } from '@sheetless/domain/shared/calendar-date'
import { createAccountClock } from '@sheetless/domain/shared/dates'

/** Logged calendar dates are not timestamps; future or invalid dates cannot describe time away. */
export function returnLogDaysAgo(lastLogged: string | null | undefined, timeZone: string | null | undefined, now: Date) {
  const days = calendarDayDifference(lastLogged, createAccountClock({ timeZone, now }).today)
  return days !== null && days >= 0 ? days : null
}
