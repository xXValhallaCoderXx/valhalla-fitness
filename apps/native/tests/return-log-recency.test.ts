import { expect, it } from 'vitest'
import { returnLogDaysAgo } from '../src/features/program/return/return-log-recency'

it('uses the account calendar day near midnight rather than elapsed hours since UTC midnight', () => {
  const now = new Date('2026-09-21T16:30:00.000Z')
  expect(returnLogDaysAgo('2026-09-21', 'Asia/Singapore', now)).toBe(1)
  expect(returnLogDaysAgo('2026-09-22', 'Asia/Singapore', now)).toBe(0)
  expect(returnLogDaysAgo('2026-09-08', 'Asia/Singapore', now)).toBe(14)
  expect(returnLogDaysAgo('2026-09-21', 'America/Los_Angeles', now)).toBe(0)
})

it.each(['2026-09-23', '2026-02-30', 'invalid', null, undefined])('does not call a future or invalid logged date today: %s', lastLogged => {
  expect(returnLogDaysAgo(lastLogged, 'Asia/Singapore', new Date('2026-09-21T16:30:00.000Z'))).toBeNull()
})
