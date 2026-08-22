import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
  calendarDateInTimeZone,
  calendarDateToUtcDate,
  calendarDayDifference,
  isCalendarDate,
  resolveIanaTimeZone,
} from './calendar-date'

dayjs.extend(relativeTime)

export type AccountClock = {
  timeZone: string
  today: string
}

export type WorkoutDateDescription = {
  workoutDate: string | null
  compactDate: string
  fullDate: string
  relativeDate: string
  completionLabel: string | null
}

function parseDate(value?: string | null) {
  if (!value) return null
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed : null
}

function formatCalendarDate(
  value: string,
  options: Intl.DateTimeFormatOptions,
) {
  const date = calendarDateToUtcDate(value)
  return date
    ? new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(date)
    : null
}

export function formatCompactDate(value?: string | null) {
  if (value && isCalendarDate(value)) {
    return formatCalendarDate(value, { month: 'short', day: 'numeric' }) ?? '—'
  }
  return parseDate(value)?.format('MMM D') ?? '—'
}

export function formatFullDate(value?: string | null) {
  if (value && isCalendarDate(value)) {
    return formatCalendarDate(value, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) ?? '—'
  }
  return parseDate(value)?.format('MMM D, YYYY') ?? '—'
}

export function formatRelativeTime(value?: string | null) {
  return parseDate(value)?.fromNow() ?? 'Unknown time'
}

export function formatDateWithRelative(value?: string | null) {
  const parsed = parseDate(value)
  if (!parsed) return '—'
  return `${parsed.format('MMM D')} · ${parsed.fromNow()}`
}

export function createAccountClock({
  timeZone,
  now = new Date(),
}: {
  timeZone?: unknown
  now?: Date
} = {}): AccountClock {
  const resolvedTimeZone = resolveIanaTimeZone(timeZone)
  return {
    timeZone: resolvedTimeZone,
    today: calendarDateInTimeZone(now, resolvedTimeZone),
  }
}

export function formatCalendarRelativeDate(
  value?: string | null,
  today?: string | null,
): string {
  const difference = calendarDayDifference(value, today)
  if (difference === null) return 'Unknown date'
  if (difference === 0) return 'Today'
  if (difference === 1) return 'Yesterday'
  if (difference === -1) return 'Tomorrow'
  if (difference > 1) return `${difference} days ago`
  return `In ${Math.abs(difference)} days`
}

export function formatCompletionDateTime(
  value: string | null | undefined,
  timeZone: unknown,
): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const resolvedTimeZone = resolveIanaTimeZone(timeZone)
  const dateLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: resolvedTimeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
  const timeLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: resolvedTimeZone,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'shortOffset',
  }).format(date)
  return `Completed ${dateLabel} at ${timeLabel}`
}

export function describeWorkoutDate({
  scheduledDate,
  completedAt,
  timeZone,
  today,
}: {
  scheduledDate?: string | null
  completedAt?: string | null
  timeZone?: unknown
  today?: string | null
}): WorkoutDateDescription {
  const resolvedTimeZone = resolveIanaTimeZone(timeZone)
  const completedInstant = completedAt ? new Date(completedAt) : null
  const completedDate = completedInstant && !Number.isNaN(completedInstant.getTime())
    ? calendarDateInTimeZone(completedInstant, resolvedTimeZone)
    : null
  const workoutDate = isCalendarDate(scheduledDate)
    ? scheduledDate
    : completedDate
  const completionLabel =
    completedAt && workoutDate && completedDate !== workoutDate
      ? formatCompletionDateTime(completedAt, resolvedTimeZone)
      : null

  return {
    workoutDate,
    compactDate: formatCompactDate(workoutDate),
    fullDate: formatFullDate(workoutDate),
    relativeDate: formatCalendarRelativeDate(workoutDate, today),
    completionLabel,
  }
}
