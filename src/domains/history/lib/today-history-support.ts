import { calculateBodyLoad } from '~/domains/history/lib/body-load'
import { buildConsistency, buildWeeklySessionCounts } from '~/domains/history/lib/consistency'
import {
  buildWeeklyVolumeBuckets,
  toBodyLoadWork,
  type HistorySessionInput,
} from '~/domains/history/lib/history'
import type { TodayHistorySupport } from '~/domains/history/types'

export const TODAY_HISTORY_WINDOW_WEEKS = 12
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function todayHistoryWindowStart(now: Date): string {
  return new Date(now.getTime() - TODAY_HISTORY_WINDOW_WEEKS * WEEK_MS).toISOString()
}

export function buildTodayHistorySupport({
  sessions,
  hasCompletedSessions,
  now,
}: {
  sessions: HistorySessionInput[]
  hasCompletedSessions: boolean
  now: Date
}): TodayHistorySupport {
  const units = sessions.find((session) => session.units)?.units ?? null
  const weeklySessions = buildWeeklySessionCounts(sessions, now.toISOString())
  return {
    hasCompletedSessions,
    units,
    bodyLoad: calculateBodyLoad(toBodyLoadWork(sessions), { now }),
    weeklyVolume: buildWeeklyVolumeBuckets(sessions, units),
    consistency: buildConsistency(weeklySessions),
  }
}
