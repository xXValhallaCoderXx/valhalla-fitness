import { calculateBodyLoad } from '@sheetless/domain/history/body-load'
import { buildConsistency, buildWeeklySessionCounts } from '@sheetless/domain/history/consistency'
import {
  buildWeeklyVolumeBuckets,
  toBodyLoadWork,
  type HistorySessionInput,
} from '@sheetless/domain/history/history'
import type { TodayHistorySupport } from '@sheetless/domain/history/types'
import {
  addCalendarDays,
  calendarDateInTimeZone,
  calendarDateToUtcDate,
  isCalendarDate,
} from '@sheetless/domain/shared/calendar-date'

export const TODAY_HISTORY_WINDOW_WEEKS = 12

export function todayHistoryWindowStart(today: string): string {
  if (!isCalendarDate(today)) throw new RangeError('Today must be a valid calendar date')
  return addCalendarDays(today, -TODAY_HISTORY_WINDOW_WEEKS * 7)!
}

export function buildTodayHistorySupport({
  sessions,
  hasCompletedSessions,
  now,
  today,
}: {
  sessions: HistorySessionInput[]
  hasCompletedSessions: boolean
  now: Date
  today?: string
}): TodayHistorySupport {
  const units = sessions.find((session) => session.units)?.units ?? null
  const accountToday = today ?? calendarDateInTimeZone(now)
  const calendarNow = calendarDateToUtcDate(accountToday) ?? now
  const weeklySessions = buildWeeklySessionCounts(sessions, accountToday)
  return {
    hasCompletedSessions,
    units,
    bodyLoad: calculateBodyLoad(toBodyLoadWork(sessions), { now: calendarNow }),
    weeklyVolume: buildWeeklyVolumeBuckets(sessions, units),
    consistency: buildConsistency(weeklySessions),
  }
}
