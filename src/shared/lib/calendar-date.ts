const UTC_TIME_ZONE = 'UTC'

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

export function calendarDateInTimeZone(
  instant: Date = new Date(),
  timeZone: unknown = null,
  fallbackTimeZone: unknown = UTC_TIME_ZONE,
): string {
  if (Number.isNaN(instant.getTime())) throw new RangeError('Cannot derive a calendar date from an invalid instant')

  const resolvedTimeZone =
    normalizeIanaTimeZone(timeZone) ??
    normalizeIanaTimeZone(fallbackTimeZone) ??
    UTC_TIME_ZONE
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
