import type { LiftE1rmSeries, RecentHistoryEntry } from '@sheetless/domain/history/types'
import { formatDateKey, parseDate, startOfWeek } from '@sheetless/domain/history/history'
import type { SessionFilter } from '@sheetless/domain/history/insights'

export type SessionLedgerRow = {
  id: string
  title: string
  /** Calendar date the session was scheduled for (YYYY-MM-DD). */
  date: string
  weekLabel: string | null
  completedSetCount: number
  plannedSetCount: number
  tonnage: number
  /** Highest e1RM logged in this session across the tracked lifts; null when none were trained. */
  topE1rm: number | null
  topE1rmMovement: string | null
  /** True when this session set a new best for one of its movements. */
  isPr: boolean
  /** Real minutes when the session recorded a start, else the planned estimate. */
  minutes: number | null
  /** False when `minutes` is the plan's estimate rather than what actually happened. */
  minutesMeasured: boolean
  /** The entry this row was built from — the table renders its badges and dates directly. */
  entry: RecentHistoryEntry
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/**
 * One row per completed session.
 *
 * Top e1RM and the personal-best flag come from `liftSeries`, which `buildLiftE1rmSeries` only
 * emits for the main barbell lifts — an accessory PR is invisible here, so the column must say what
 * it covers rather than implying every lift was considered.
 */
export function buildSessionLedgerRows({
  sessions,
  liftSeries,
}: {
  sessions: RecentHistoryEntry[]
  liftSeries: LiftE1rmSeries[] | null
}): SessionLedgerRow[] {
  const bests = bestBySession(liftSeries)

  return sessions.map((session): SessionLedgerRow => {
    const best = bests.get(session.id) ?? null
    // `estimatedMinutes` is what the plan expected, not what happened; never present one as the
    // other, so the caller can mark an estimate as an estimate.
    const measured = typeof session.durationMinutes === 'number'
    return {
      id: session.id,
      title: session.title,
      date: session.scheduledDate,
      weekLabel: session.weekLabel ?? null,
      completedSetCount: session.completedSetCount,
      plannedSetCount: session.plannedSetCount,
      tonnage: session.tonnage,
      topE1rm: best?.e1rm ?? null,
      topE1rmMovement: best?.movementName ?? null,
      isPr: best?.isPr ?? false,
      minutes: measured ? session.durationMinutes : (session.estimatedMinutes ?? null),
      minutesMeasured: measured,
      entry: session,
    }
  })
}

/**
 * The best e1RM each session produced, and whether it beat everything before it.
 *
 * `points` are ascending by date, so a running maximum per movement decides the PR without
 * re-scanning — and a point only counts as a personal best if it is strictly greater, so repeating
 * a previous best does not read as a new one.
 */
function bestBySession(liftSeries: LiftE1rmSeries[] | null) {
  const bySession = new Map<string, { e1rm: number; movementName: string; isPr: boolean }>()
  for (const lift of liftSeries ?? []) {
    let running = 0
    for (const point of lift.points) {
      if (point.outlier) continue
      const isPr = point.e1rm > running
      if (isPr) running = point.e1rm
      const existing = bySession.get(point.sessionId)
      if (!existing || point.e1rm > existing.e1rm) {
        bySession.set(point.sessionId, { e1rm: point.e1rm, movementName: lift.movementName, isPr })
      } else if (isPr) {
        // A PR on a second lift still makes the session a PR session, even if it was not the top set.
        bySession.set(point.sessionId, { ...existing, isPr: true })
      }
    }
  }
  return bySession
}

export type SessionLedgerTotals = {
  sessions: number
  completedSets: number
  plannedSets: number
  tonnage: number
  /** Mean of the sessions that actually recorded one; null when none did. */
  averageMinutes: number | null
  prCount: number
}

export function sessionLedgerTotals(rows: SessionLedgerRow[]): SessionLedgerTotals {
  const measured = rows.filter((row) => row.minutesMeasured && row.minutes !== null)
  return {
    sessions: rows.length,
    completedSets: rows.reduce((sum, row) => sum + row.completedSetCount, 0),
    plannedSets: rows.reduce((sum, row) => sum + row.plannedSetCount, 0),
    tonnage: rows.reduce((sum, row) => sum + row.tonnage, 0),
    averageMinutes: measured.length
      ? Math.round(measured.reduce((sum, row) => sum + (row.minutes ?? 0), 0) / measured.length)
      : null,
    prCount: rows.filter((row) => row.isPr).length,
  }
}

export type WeekComparison = {
  current: { sessions: number; tonnage: number }
  previous: { sessions: number; tonnage: number }
  /** The current week is still running, so its figures are not a like-for-like comparison. */
  currentInProgress: true
  weekStart: string
  previousWeekStart: string
}

/**
 * This week against last.
 *
 * Anchored to the calendar, never to array position: sessions are sparse, so taking "the previous
 * bucket" would compare against whenever the lifter last trained. The current week is deliberately
 * included and flagged as in-progress rather than excluded — the design shows "2 vs 5 · in
 * progress", which is honest, where a bare "2 vs 5" would read as a collapse every Monday.
 */
export function weekOverWeekTotals(rows: SessionLedgerRow[], now: string): WeekComparison | null {
  const nowDate = parseDate(now)
  if (!nowDate) return null
  const currentStart = startOfWeek(nowDate)
  const previousStart = new Date(currentStart.getTime() - WEEK_MS)
  const currentKey = formatDateKey(currentStart)
  const previousKey = formatDateKey(previousStart)

  const bucket = (key: string) => {
    const inWeek = rows.filter((row) => {
      const date = parseDate(row.date)
      return date !== null && formatDateKey(startOfWeek(date)) === key
    })
    return {
      sessions: inWeek.length,
      tonnage: inWeek.reduce((sum, row) => sum + row.tonnage, 0),
    }
  }

  return {
    current: bucket(currentKey),
    previous: bucket(previousKey),
    currentInProgress: true,
    weekStart: currentKey,
    previousWeekStart: previousKey,
  }
}

/** The columns each mode shows, so the CSV matches what was on screen. */
export const SESSION_LEDGER_COLUMNS = {
  guided: ['Date', 'Session', 'Sets', 'Weight moved', 'Best lift', 'Time'],
  full: ['Date', 'Session', 'Week', 'Sets', 'Tonnage', 'Top e1RM', 'PR', 'Time'],
} as const

/**
 * The rows on screen, as CSV.
 *
 * Quotes every field rather than guessing which need it: a session title can contain a comma, a
 * quote, or a newline, and a CSV that only escapes the cases someone thought of is worse than one
 * that escapes everything.
 */
export function sessionLedgerCsv(rows: SessionLedgerRow[], mode: 'guided' | 'full'): string {
  const header = SESSION_LEDGER_COLUMNS[mode]
  const body = rows.map((row) =>
    mode === 'guided'
      ? [
          row.date,
          row.title,
          `${row.completedSetCount}`,
          `${row.tonnage}`,
          row.topE1rmMovement ?? '',
          minutesCell(row),
        ]
      : [
          row.date,
          row.title,
          row.weekLabel ?? '',
          `${row.completedSetCount}/${row.plannedSetCount}`,
          `${row.tonnage}`,
          row.topE1rm === null ? '' : `${row.topE1rm}`,
          row.isPr ? 'yes' : '',
          minutesCell(row),
        ],
  )
  return [header, ...body].map((cells) => cells.map(csvCell).join(',')).join('\r\n')
}

function minutesCell(row: SessionLedgerRow): string {
  if (row.minutes === null) return ''
  return row.minutesMeasured ? `${row.minutes}` : `~${row.minutes}`
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

/** The ledger's own filters, on top of the intensity and ad-hoc chips the tab already had. */
export type LedgerFilter = SessionFilter | 'programme' | 'pr'

/**
 * Filtering happens on rows, not entries, because "PRs only" is a derived property.
 *
 * Rows are always built for the whole history first so the totals panel keeps describing
 * everything in range rather than whatever the current filter left behind.
 */
export function filterLedgerRows(
  rows: SessionLedgerRow[],
  filter: LedgerFilter,
  query: string,
  activeProgramTitle?: string | null,
): SessionLedgerRow[] {
  const byKind = rows.filter((row) => {
    if (filter === 'all') return true
    if (filter === 'pr') return row.isPr
    if (filter === 'programme') {
      return Boolean(activeProgramTitle) && row.entry.programTitle === activeProgramTitle
    }
    if (filter === 'adhoc') return Boolean(row.entry.isAdHoc)
    return row.entry.hardness === filter
  })
  const text = query.trim().toLowerCase()
  if (!text) return byKind
  return byKind.filter((row) => row.title.toLowerCase().includes(text))
}
