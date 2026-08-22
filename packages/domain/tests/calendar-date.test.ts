import { describe, expect, it } from 'vitest'
import {
  addCalendarDays,
  calendarDateToUtcDate,
  calendarDayDifference,
  calendarDateInTimeZone,
  isCalendarDate,
  normalizeIanaTimeZone,
  parseCalendarDate,
} from '@sheetless/domain/shared/calendar-date'
import {
  createAccountClock,
  describeWorkoutDate,
  formatCalendarRelativeDate,
} from '@sheetless/domain/shared/dates'

describe('calendar dates in user timezones', () => {
  const instant = new Date('2026-07-28T16:30:00.000Z')

  it('uses the calendar date in the requested IANA timezone', () => {
    expect(calendarDateInTimeZone(instant, 'Asia/Singapore')).toBe('2026-07-29')
    expect(calendarDateInTimeZone(instant, 'America/Los_Angeles')).toBe('2026-07-28')
  })

  it('falls back to UTC for a missing or invalid stored timezone', () => {
    expect(calendarDateInTimeZone(instant, null)).toBe('2026-07-28')
    expect(calendarDateInTimeZone(instant, 'Mars/Olympus')).toBe('2026-07-28')
  })

  it('accepts a valid explicit fallback timezone', () => {
    expect(calendarDateInTimeZone(instant, 'invalid', 'Pacific/Auckland')).toBe('2026-07-29')
  })

  it('normalizes valid zones and rejects invalid values', () => {
    expect(normalizeIanaTimeZone(' Asia/Singapore ')).toBe('Asia/Singapore')
    expect(normalizeIanaTimeZone('Mars/Olympus')).toBeNull()
    expect(normalizeIanaTimeZone(null)).toBeNull()
  })

  it('rejects an invalid instant', () => {
    expect(() => calendarDateInTimeZone(new Date('invalid'), 'UTC')).toThrow(
      'Cannot derive a calendar date from an invalid instant',
    )
  })

  it('strictly validates calendar dates, including leap years', () => {
    expect(parseCalendarDate('2028-02-29')).toEqual({ year: 2028, month: 2, day: 29 })
    expect(calendarDateToUtcDate('2028-02-29')?.toISOString()).toBe('2028-02-29T00:00:00.000Z')
    expect(isCalendarDate('2026-02-29')).toBe(false)
    expect(isCalendarDate('2026-2-09')).toBe(false)
    expect(isCalendarDate('2026-04-31')).toBe(false)
  })

  it('does calendar arithmetic without DST or browser timezone shifts', () => {
    expect(calendarDayDifference('2026-03-07', '2026-03-09')).toBe(2)
    expect(calendarDayDifference('2026-11-01', '2026-11-02')).toBe(1)
    expect(addCalendarDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addCalendarDays('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('account workout dates', () => {
  it('creates a stable account clock in the stored timezone', () => {
    const now = new Date('2026-07-28T16:30:00.000Z')
    expect(createAccountClock({ timeZone: 'Asia/Singapore', now })).toEqual({
      timeZone: 'Asia/Singapore',
      today: '2026-07-29',
    })
  })

  it('uses calendar-day relative labels instead of elapsed-time rounding', () => {
    expect(formatCalendarRelativeDate('2026-07-29', '2026-07-29')).toBe('Today')
    expect(formatCalendarRelativeDate('2026-07-28', '2026-07-29')).toBe('Yesterday')
    expect(formatCalendarRelativeDate('2026-07-16', '2026-07-29')).toBe('13 days ago')
    expect(formatCalendarRelativeDate('2026-07-30', '2026-07-29')).toBe('Tomorrow')
  })

  it('keeps the scheduled date primary and notes an overnight completion', () => {
    const description = describeWorkoutDate({
      scheduledDate: '2026-07-15',
      completedAt: '2026-07-15T16:30:00.000Z',
      timeZone: 'Asia/Singapore',
      today: '2026-07-29',
    })

    expect(description).toEqual({
      workoutDate: '2026-07-15',
      compactDate: 'Jul 15',
      fullDate: 'Jul 15, 2026',
      relativeDate: '14 days ago',
      completionLabel: 'Completed Jul 16, 2026 at 12:30 AM GMT+8',
    })
  })

  it('does not add a completion label when both dates are the same locally', () => {
    expect(
      describeWorkoutDate({
        scheduledDate: '2026-07-15',
        completedAt: '2026-07-15T12:00:00.000Z',
        timeZone: 'Asia/Singapore',
        today: '2026-07-15',
      }).completionLabel,
    ).toBeNull()
  })
})
