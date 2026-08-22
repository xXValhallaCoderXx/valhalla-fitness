import {
  addCalendarDays,
  calendarDateInTimeZone,
  calendarDateToUtcDate,
  calendarDayDifference,
  isCalendarDate,
  normalizeIanaTimeZone,
  parseCalendarDate,
} from '@sheetless/domain/shared/calendar-date'
import {
  createAccountClock,
  describeWorkoutDate,
  formatCalendarRelativeDate,
} from '@sheetless/domain/shared/dates'

export type IcuCheckResult = {
  name: string
  expected: string
  actual: string
  pass: boolean
}

export type IcuCheckReport = {
  results: IcuCheckResult[]
  passed: number
  failed: number
  allPass: boolean
}

function escapeNonAscii(value: string): string {
  // Make invisible/exotic characters visible in expected-vs-actual diffs.
  return value.replace(/[^\x20-\x7e]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)
}

function show(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return escapeNonAscii(value)
  try {
    return escapeNonAscii(JSON.stringify(value))
  } catch {
    return String(value)
  }
}

/**
 * Every assertion from the web repo's tests/calendar-date.test.ts, runnable on-device.
 * These are the account-timezone calendar-day invariants that must hold on Hermes
 * (full ICU: Intl.DateTimeFormat with arbitrary IANA timeZone, formatToParts,
 * resolvedOptions().timeZone normalization, and timeZoneName: 'shortOffset').
 */
export function runIcuChecks(): IcuCheckReport {
  const results: IcuCheckResult[] = []

  const check = (name: string, expected: unknown, run: () => unknown) => {
    let actual: unknown
    let pass: boolean
    try {
      actual = run()
      pass = show(actual) === show(expected)
    } catch (error) {
      actual = `threw: ${error instanceof Error ? error.message : String(error)}`
      pass = false
    }
    const expectedShown = show(expected)
    const actualShown = show(actual)
    results.push({
      name,
      expected: pass ? expectedShown : `${expectedShown} [len=${expectedShown.length}]`,
      actual: pass ? actualShown : `${actualShown} [len=${actualShown.length}]`,
      pass,
    })
  }

  const checkThrows = (name: string, expectedMessage: string, run: () => unknown) => {
    let actual: string
    let pass = false
    try {
      const value = run()
      actual = `returned: ${show(value)}`
    } catch (error) {
      actual = error instanceof Error ? error.message : String(error)
      pass = actual.includes(expectedMessage)
    }
    results.push({ name, expected: `throws "${expectedMessage}"`, actual, pass })
  }

  const instant = new Date('2026-07-28T16:30:00.000Z')

  check('calendar date in Asia/Singapore', '2026-07-29', () =>
    calendarDateInTimeZone(instant, 'Asia/Singapore'))
  check('calendar date in America/Los_Angeles', '2026-07-28', () =>
    calendarDateInTimeZone(instant, 'America/Los_Angeles'))
  check('missing timezone falls back to UTC', '2026-07-28', () =>
    calendarDateInTimeZone(instant, null))
  check('invalid timezone falls back to UTC', '2026-07-28', () =>
    calendarDateInTimeZone(instant, 'Mars/Olympus'))
  check('explicit fallback timezone (Pacific/Auckland)', '2026-07-29', () =>
    calendarDateInTimeZone(instant, 'invalid', 'Pacific/Auckland'))

  check('normalizes " Asia/Singapore "', 'Asia/Singapore', () =>
    normalizeIanaTimeZone(' Asia/Singapore '))
  check('rejects Mars/Olympus', null, () => normalizeIanaTimeZone('Mars/Olympus'))
  check('rejects null timezone', null, () => normalizeIanaTimeZone(null))

  checkThrows('invalid instant throws', 'Cannot derive a calendar date from an invalid instant', () =>
    calendarDateInTimeZone(new Date('invalid'), 'UTC'))

  check('parses leap day 2028-02-29', { year: 2028, month: 2, day: 29 }, () =>
    parseCalendarDate('2028-02-29'))
  check('leap day as UTC instant', '2028-02-29T00:00:00.000Z', () =>
    calendarDateToUtcDate('2028-02-29')?.toISOString())
  check('rejects 2026-02-29 (not a leap year)', false, () => isCalendarDate('2026-02-29'))
  check('rejects 2026-2-09 (bad format)', false, () => isCalendarDate('2026-2-09'))
  check('rejects 2026-04-31 (no such day)', false, () => isCalendarDate('2026-04-31'))

  check('day difference Mar 7 → Mar 9 (across US DST)', 2, () =>
    calendarDayDifference('2026-03-07', '2026-03-09'))
  check('day difference Nov 1 → Nov 2 (across US DST)', 1, () =>
    calendarDayDifference('2026-11-01', '2026-11-02'))
  check('add day onto leap day', '2028-02-29', () => addCalendarDays('2028-02-28', 1))
  check('add day across year end', '2027-01-01', () => addCalendarDays('2026-12-31', 1))

  const now = new Date('2026-07-28T16:30:00.000Z')
  check('account clock in Asia/Singapore', { timeZone: 'Asia/Singapore', today: '2026-07-29' }, () =>
    createAccountClock({ timeZone: 'Asia/Singapore', now }))

  check('relative label: Today', 'Today', () =>
    formatCalendarRelativeDate('2026-07-29', '2026-07-29'))
  check('relative label: Yesterday', 'Yesterday', () =>
    formatCalendarRelativeDate('2026-07-28', '2026-07-29'))
  check('relative label: 13 days ago', '13 days ago', () =>
    formatCalendarRelativeDate('2026-07-16', '2026-07-29'))
  check('relative label: Tomorrow', 'Tomorrow', () =>
    formatCalendarRelativeDate('2026-07-30', '2026-07-29'))

  check(
    'overnight completion label (shortOffset GMT+8)',
    {
      workoutDate: '2026-07-15',
      compactDate: 'Jul 15',
      fullDate: 'Jul 15, 2026',
      relativeDate: '14 days ago',
      completionLabel: 'Completed Jul 16, 2026 at 12:30 AM GMT+8',
    },
    () =>
      describeWorkoutDate({
        scheduledDate: '2026-07-15',
        completedAt: '2026-07-15T16:30:00.000Z',
        timeZone: 'Asia/Singapore',
        today: '2026-07-29',
      }),
  )

  check('same-local-day completion has no label', null, () =>
    describeWorkoutDate({
      scheduledDate: '2026-07-15',
      completedAt: '2026-07-15T12:00:00.000Z',
      timeZone: 'Asia/Singapore',
      today: '2026-07-15',
    }).completionLabel)

  const passed = results.filter((result) => result.pass).length
  const failed = results.length - passed
  return { results, passed, failed, allPass: failed === 0 }
}
