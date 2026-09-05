import type { BodyweightEntry } from '../account/types'
import { isCalendarDate } from '../account/schemas'
import { convertWeight } from '../shared/math'
import type { Unit } from '../shared/types'
import { rangeStart, type InsightRange } from './insight-ranges'

export type BodyweightTrendPoint = {
  id: string
  date: string
  /** Calendar date at UTC midnight, for proportional spacing, never a local instant. */
  x: number
  value: number
}

/** Actual measurements only. Values and changes remain unrounded until presentation. */
export function buildBodyweightTrend({ entries, range, today, units }: {
  entries: BodyweightEntry[]
  range: InsightRange
  today: string
  units: Unit
}) {
  const measurements = entries
    .filter((entry) => isCalendarDate(entry.recordedOn) && entry.recordedOn <= today &&
      Number.isFinite(entry.weightKg) && entry.weightKg > 0)
    .sort((a, b) => a.recordedOn.localeCompare(b.recordedOn))
    .map((entry): BodyweightTrendPoint => ({
      id: entry.id, date: entry.recordedOn,
      x: Date.parse(`${entry.recordedOn}T00:00:00Z`),
      value: convertWeight(entry.weightKg, 'kg', units),
    }))
  const start = rangeStart(range, measurements[0]?.date ?? null, today)
  const points = measurements.filter((point) => !start || point.date >= start)
  const latest = measurements[measurements.length - 1] ?? null
  return {
    points,
    latest,
    count: points.length,
    totalCount: measurements.length,
    latestOutsideRange: latest !== null && !points.some((point) => point.id === latest.id),
    change: points.length >= 2 ? points[points.length - 1].value - points[0].value : null,
  }
}
