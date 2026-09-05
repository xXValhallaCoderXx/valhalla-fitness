import {
  isCalendarDate,
  type BodyweightLogInput,
} from '@sheetless/domain/account/schemas'
import { convertWeight } from '@sheetless/domain/shared/math'
import { calendarDateInTimeZone } from '@sheetless/domain/shared/calendar-date'

/** Plausibility bounds for a human bodyweight, exclusive, in canonical kg. */
export const bodyweightBoundsKg = { min: 20, max: 500 }

/**
 * Pure normalization for a bodyweight log: converts the entered weight to
 * canonical kg and resolves the calendar date. Throws user-facing messages
 * (surfaced verbatim by the form) for implausible weights or malformed dates.
 * `now` and `timezone` are injected by the caller so the default date is testable.
 */
export function normalizeBodyweightLog(
  input: BodyweightLogInput,
  now: string,
  timezone: string | null = null,
): { recordedOn: string; weightKg: number } {
  const weightKg = convertWeight(input.weight, input.unit, 'kg')
  if (!Number.isFinite(weightKg) || weightKg <= bodyweightBoundsKg.min || weightKg >= bodyweightBoundsKg.max) {
    throw new Error('That bodyweight looks unlikely — enter a weight between 20 and 500 kg (about 44 and 1100 lb).')
  }
  const recordedOn = input.recordedOn ?? calendarDateInTimeZone(new Date(now), timezone)
  if (!isCalendarDate(recordedOn)) {
    throw new Error('Use a calendar date in YYYY-MM-DD format.')
  }
  return { recordedOn, weightKg }
}
