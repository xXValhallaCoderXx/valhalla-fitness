import type { ConsistencySummary, WeeklyCount } from '~/shared/types'
import {
  formatDateKey,
  formatWeekLabel,
  parseDate,
  startOfWeek,
  type HistorySessionInput,
} from '~/domains/history/lib/history'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Buckets sessions into Monday-UTC weeks, zero-filling every week from the
 * first session's week through the week containing `now` (ascending).
 */
export function buildWeeklySessionCounts(sessions: HistorySessionInput[], now: string): WeeklyCount[] {
  const counts = new Map<string, number>()
  let earliest: Date | null = null
  for (const session of sessions) {
    const date = parseDate(session.completedAt ?? session.scheduledDate)
    if (!date) continue
    const week = startOfWeek(date)
    const key = formatDateKey(week)
    counts.set(key, (counts.get(key) ?? 0) + 1)
    if (!earliest || week.getTime() < earliest.getTime()) earliest = week
  }
  if (!earliest) return []

  const nowDate = parseDate(now)
  const lastWeekStart = nowDate ? startOfWeek(nowDate).getTime() : earliest.getTime()
  const end = Math.max(lastWeekStart, earliest.getTime())

  const buckets: WeeklyCount[] = []
  // Monday-UTC week starts are exactly 7 days apart (no DST in UTC).
  for (let time = earliest.getTime(); time <= end; time += WEEK_MS) {
    const weekStart = new Date(time)
    const key = formatDateKey(weekStart)
    buckets.push({
      weekStart: key,
      weekLabel: formatWeekLabel(weekStart),
      sessionCount: counts.get(key) ?? 0,
    })
  }
  return buckets
}

export function buildConsistency(weekly: WeeklyCount[]): ConsistencySummary {
  const totalWeeks = weekly.length
  const weeksTrained = weekly.filter((week) => week.sessionCount > 0).length
  const totalSessions = weekly.reduce((sum, week) => sum + week.sessionCount, 0)
  const avgSessionsPerWeek = totalWeeks === 0 ? null : Math.round((totalSessions / totalWeeks) * 10) / 10
  const percentWeeksTrained = totalWeeks === 0 ? null : Math.round((100 * weeksTrained) / totalWeeks)

  let longestStreakWeeks = 0
  let run = 0
  for (const week of weekly) {
    run = week.sessionCount > 0 ? run + 1 : 0
    if (run > longestStreakWeeks) longestStreakWeeks = run
  }

  // The last bucket is the current (likely in-progress) week: if it is empty,
  // it must not break the streak — count back from the previous bucket instead.
  let index = weekly.length - 1
  if (index >= 0 && weekly[index].sessionCount === 0) index -= 1
  let currentStreakWeeks = 0
  while (index >= 0 && weekly[index].sessionCount > 0) {
    currentStreakWeeks += 1
    index -= 1
  }

  return {
    avgSessionsPerWeek,
    longestStreakWeeks,
    currentStreakWeeks,
    weeksTrained,
    totalWeeks,
    percentWeeksTrained,
  }
}

export const consistencyExplanation =
  'How regularly you train: average sessions per week, and streaks of weeks in a row with at least one workout. Showing up is what drives every other number here.'

/** A one-week "streak" is just last week; only celebrate from two weeks up. */
export const STREAK_BADGE_MIN_WEEKS = 2

/**
 * Habit-loop badge copy for surfaces outside Insights (Today hero), e.g.
 * "3-week streak 🔥". Null when there is nothing worth shouting about —
 * hide the badge rather than shame a fresh or returning user.
 */
export function streakBadgeLabel(consistency: ConsistencySummary | null | undefined): string | null {
  const weeks = consistency?.currentStreakWeeks ?? 0
  if (weeks < STREAK_BADGE_MIN_WEEKS) return null
  return `${weeks}-week streak 🔥`
}
