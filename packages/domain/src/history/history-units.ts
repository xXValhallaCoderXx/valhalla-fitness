import type { HistorySessionInput } from './history'
import type { Unit } from '../shared/types'

/** Historical values never inherit the mutable account preference. */
export function historicalFallbackUnits(sessions: Pick<HistorySessionInput, 'id' | 'scheduledDate' | 'completedAt' | 'units'>[]): Unit {
  return [...sessions].sort((a, b) =>
    b.scheduledDate.localeCompare(a.scheduledDate) ||
    (b.completedAt ?? '').localeCompare(a.completedAt ?? '') || b.id.localeCompare(a.id),
  ).find(session => session.units)?.units ?? 'kg'
}

export function withHistoricalUnits(sessions: HistorySessionInput[]): HistorySessionInput[] {
  const fallback = historicalFallbackUnits(sessions)
  return sessions.map(session => ({ ...session, units: session.units ?? fallback }))
}
