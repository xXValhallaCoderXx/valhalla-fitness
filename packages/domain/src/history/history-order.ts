type HistorySessionOrderKey = { id: string; scheduledDate: string; completedAt?: string | null }

export function compareHistorySessionsNewestFirst(
  left: HistorySessionOrderKey,
  right: HistorySessionOrderKey,
) {
  const scheduledDateCompare = right.scheduledDate.localeCompare(left.scheduledDate)
  if (scheduledDateCompare !== 0) return scheduledDateCompare
  const completedAtCompare = (right.completedAt ?? '').localeCompare(left.completedAt ?? '')
  if (completedAtCompare !== 0) return completedAtCompare
  return right.id.localeCompare(left.id)
}

export function parseDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
