const UTC_TIME_ZONE = 'UTC'
const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const DAY_MS = 86_400_000

export type CalendarDateParts = {
  year: number
  month: number
  day: number
}

export function normalizeIanaTimeZone(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: value.trim() }).resolvedOptions().timeZone
  } catch {
    return null
  }
}

export function browserIanaTimeZone(): string | null {
  if (typeof Intl === 'undefined') return null
  try {
    return normalizeIanaTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  } catch {
    return null
  }
}

export function resolveIanaTimeZone(
  value: unknown,
  fallbackTimeZone: unknown = UTC_TIME_ZONE,
): string {
  return (
    normalizeIanaTimeZone(value) ??
    normalizeIanaTimeZone(fallbackTimeZone) ??
    UTC_TIME_ZONE
  )
}

export function parseCalendarDate(value: unknown): CalendarDateParts | null {
  if (typeof value !== 'string') return null
  const match = CALENDAR_DATE_PATTERN.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return { year, month, day }
}

export function isCalendarDate(value: unknown): value is string {
  return parseCalendarDate(value) !== null
}

export function calendarDateToUtcDate(value: unknown): Date | null {
  const parts = parseCalendarDate(value)
  return parts
    ? new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
    : null
}

/** `to` minus `from` in whole calendar days. */
export function calendarDayDifference(from: unknown, to: unknown): number | null {
  const fromDate = calendarDateToUtcDate(from)
  const toDate = calendarDateToUtcDate(to)
  if (!fromDate || !toDate) return null
  return Math.round((toDate.getTime() - fromDate.getTime()) / DAY_MS)
}

export function addCalendarDays(value: unknown, days: number): string | null {
  const date = calendarDateToUtcDate(value)
  if (!date || !Number.isInteger(days)) return null
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function calendarDateInTimeZone(
  instant: Date = new Date(),
  timeZone: unknown = null,
  fallbackTimeZone: unknown = UTC_TIME_ZONE,
): string {
  if (Number.isNaN(instant.getTime())) throw new RangeError('Cannot derive a calendar date from an invalid instant')

  const resolvedTimeZone = resolveIanaTimeZone(timeZone, fallbackTimeZone)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: resolvedTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  if (!values.year || !values.month || !values.day) {
    throw new Error('Calendar date formatter did not return year, month, and day')
  }
  return `${values.year}-${values.month}-${values.day}`
}
