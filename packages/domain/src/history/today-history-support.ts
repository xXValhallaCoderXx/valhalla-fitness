import { calculateBodyLoad } from '@sheetless/domain/history/body-load'
import { buildConsistency } from '@sheetless/domain/history/consistency'
import {
  buildWeeklyVolumeBuckets,
  toBodyLoadWork,
  startOfWeek,
  formatDateKey,
  type HistorySessionInput,
} from '@sheetless/domain/history/history'
import type { TodayHistorySupport, WeeklyCount } from '@sheetless/domain/history/types'
import type { Unit } from '@sheetless/domain/shared/types'
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
  completedDates,
  displayUnits,
}: {
  sessions: HistorySessionInput[]
  hasCompletedSessions: boolean
  now: Date
  today?: string
  /** All completed workout dates; detailed session history can remain bounded. */
  completedDates?: string[]
  displayUnits?: Unit
}): TodayHistorySupport {
  const units = displayUnits ?? sessions.find((session) => session.units)?.units ?? null
  const accountToday = today ?? calendarDateInTimeZone(now)
  const calendarNow = calendarDateToUtcDate(accountToday) ?? now
  const dates = (completedDates ?? sessions.map(session => session.scheduledDate))
    .filter(date => isCalendarDate(date) && date <= accountToday)
  const weekStart = formatDateKey(startOfWeek(calendarNow))
  const counts = new Map<string, number>()
  for (const date of dates) {
    const key = formatDateKey(startOfWeek(calendarDateToUtcDate(date)!))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const firstWeek = [...counts.keys()].sort()[0]
  const weeklySessions: WeeklyCount[] = []
  for (let week = firstWeek; week && week <= weekStart; week = addCalendarDays(week, 7)!) {
    weeklySessions.push({ weekStart: week, weekLabel: week, sessionCount: counts.get(week) ?? 0 })
  }
  const weeklyVolume = buildWeeklyVolumeBuckets(sessions.filter(session => session.scheduledDate <= accountToday), units)
  const volume = weeklyVolume.find(week => week.weekStart === weekStart)?.volume ?? 0
  const previousWeekVolume = weeklyVolume.find(week => week.weekStart === addCalendarDays(weekStart, -7))?.volume ?? 0
  const dayCounts = new Map<string, number>()
  for (const date of dates) dayCounts.set(date, (dayCounts.get(date) ?? 0) + 1)
  return {
    hasCompletedSessions,
    units,
    bodyLoad: calculateBodyLoad(toBodyLoadWork(sessions), { now: calendarNow }),
    weeklyVolume,
    consistency: buildConsistency(weeklySessions),
    calendarWeek: {
      today: accountToday, weekStart,
      days: Array.from({ length: 7 }, (_, index) => {
        const date = addCalendarDays(weekStart, index)!
        return { date, completedSessions: dayCounts.get(date) ?? 0 }
      }),
      completedSessions: counts.get(weekStart) ?? 0,
      volume, previousWeekVolume,
      volumeChangePercent: previousWeekVolume > 0 ? Math.round((volume / previousWeekVolume - 1) * 100) : null,
    },
  }
}
