import { formatDateKey, parseDate } from '~/domains/history/lib/history'

export type InsightRange = '8w' | '3m' | '1y' | 'all'

export const INSIGHT_RANGES: InsightRange[] = ['8w', '3m', '1y', 'all']

export const RANGE_DAYS: Record<InsightRange, number | null> = {
  '8w': 56,
  '3m': 91,
  '1y': 365,
  all: null,
}

export const insightRangeLabels: Record<InsightRange, string> = {
  '8w': '8W',
  '3m': '3M',
  '1y': '1Y',
  all: 'All',
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Start of the visible window as a date key (yyyy-mm-dd), clamped so the axis
 * never predates real data: max(now − RANGE_DAYS, firstDataDate). For 'all'
 * the start is firstDataDate itself (null when there is no data yet).
 */
export function rangeStart(range: InsightRange, firstDataDate: string | null, now: string): string | null {
  const first = parseDate(firstDataDate)
  const days = RANGE_DAYS[range]
  if (days === null) return first ? formatDateKey(first) : null
  const nowDate = parseDate(now)
  if (!nowDate) return null
  const windowStart = new Date(nowDate.getTime() - days * DAY_MS)
  const start = first && first.getTime() > windowStart.getTime() ? first : windowStart
  return formatDateKey(start)
}

export function filterToRange<T>(
  items: T[],
  range: InsightRange,
  options: { firstDataDate: string | null; now: string; getDate: (item: T) => string },
): T[] {
  const start = rangeStart(range, options.firstDataDate, options.now)
  if (start === null) return items
  const startDate = parseDate(start)
  if (!startDate) return items
  const startTime = startDate.getTime()
  return items.filter((item) => {
    const date = parseDate(options.getDate(item))
    return date !== null && date.getTime() >= startTime
  })
}

/** Whole days between rangeStart and now (UTC dates); null when no window applies. */
export function rangeSpanDays(range: InsightRange, firstDataDate: string | null, now: string): number | null {
  const start = rangeStart(range, firstDataDate, now)
  const nowDate = parseDate(now)
  if (start === null || !nowDate) return null
  const startDate = parseDate(start)
  if (!startDate) return null
  const nowDay = Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate())
  return Math.round((nowDay - startDate.getTime()) / DAY_MS)
}
