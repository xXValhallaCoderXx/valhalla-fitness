import { describe, expect, it } from 'vitest'
import {
  calendarDateInTimeZone,
  normalizeIanaTimeZone,
} from '../src/shared/lib/calendar-date'

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
})
