import type { RecentHistoryEntry } from './types'
import { filterSessions, type SessionFilter } from './insights'
import { filterToRange, type InsightRange } from './insight-ranges'

export type CompletionFilter = 'all' | 'finished' | 'cut_short'
export type WorkoutCompletion = Exclude<CompletionFilter, 'all'> | 'empty' | 'unknown'

/** Recap counts saved set rows, including unlogged rows, rather than the old prescription. */
export function workoutCompletion(session: RecentHistoryEntry): WorkoutCompletion {
  const recorded = session.recordedSetCount
  if (session.completedSetCount === 0) return 'empty'
  if (recorded == null || recorded <= 0 || session.completedSetCount > recorded) return 'unknown'
  return session.completedSetCount === recorded ? 'finished' : 'cut_short'
}

export const workoutCompletionLabels: Record<WorkoutCompletion, string> = {
  finished: 'Finished', cut_short: 'Cut short', empty: 'No sets logged', unknown: 'Saved workout',
}

export type SessionBrowserState = {
  query: string
  intensity: SessionFilter
  completion: CompletionFilter
  date: string | null
  page: number
}

export const SESSION_PAGE_SIZE = 20

export function selectSessionPage(sessions: RecentHistoryEntry[], state: SessionBrowserState, range: InsightRange, today: string) {
  const ranged = filterToRange(sessions, range, { firstDataDate: null, now: today, getDate: row => row.scheduledDate })
    .filter(row => row.scheduledDate <= today)
  const matches = filterSessions(ranged, state.intensity, state.query).filter(row =>
    (state.completion === 'all' || workoutCompletion(row) === state.completion) &&
    (!state.date || row.scheduledDate === state.date),
  )
  const pages = Math.max(1, Math.ceil(matches.length / SESSION_PAGE_SIZE))
  const page = Math.min(Math.max(0, state.page), pages - 1)
  return { rows: matches.slice(page * SESSION_PAGE_SIZE, (page + 1) * SESSION_PAGE_SIZE), total: matches.length, page, pages }
}

/** Today and the preceding 13 account-calendar days; counts describe loaded history only. */
export function recentWorkoutDates(sessions: RecentHistoryEntry[], today: string) {
  const end = Date.parse(`${today}T00:00:00Z`)
  if (!Number.isFinite(end)) return []
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(end - (13 - index) * 86_400_000).toISOString().slice(0, 10)
    return { date, count: sessions.filter(session => session.scheduledDate === date).length }
  })
}
