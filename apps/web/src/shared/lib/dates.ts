import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

function parseDate(value?: string | null) {
  if (!value) return null
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed : null
}

export function formatCompactDate(value?: string | null) {
  return parseDate(value)?.format('MMM D') ?? '—'
}

export function formatFullDate(value?: string | null) {
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
