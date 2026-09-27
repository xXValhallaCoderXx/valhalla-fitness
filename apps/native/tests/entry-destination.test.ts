import { describe, expect, it } from 'vitest'
import { DEFAULT_ENTRY_DESTINATION, getEntryDestination, safeEntryDestination } from '../src/lib/entry-destination'

const sessionId = '14d7442c-28f3-41b5-81fc-778320c38892'

describe('native entry destination', () => {
  it.each([
    ['/', '/(tabs)'], ['/program', '/(tabs)/program'], ['/history', '/(tabs)/history'],
    ['/you', '/(tabs)/you'], ['/program/weeks', '/(tabs)/program/weeks'],
    ['/program/equipment', '/(tabs)/program/equipment'], ['/templates', '/templates'],
    ['/templates/find', '/templates/find'], ['/template/basic-3-day', '/template/basic-3-day'],
    ['/template/custom_123/setup', '/template/custom_123/setup'],
    [`/session/${sessionId}`, `/session/${sessionId}`],
    [`/session/${sessionId}/summary`, `/session/${sessionId}/summary`],
  ])('preserves supported route %s', (input, expected) => {
    expect(safeEntryDestination(input)).toBe(expected)
    expect(safeEntryDestination(expected)).toBe(expected)
  })

  it.each([
    undefined, null, ['/settings'], '', 'https://example.com/settings', '//example.com/settings',
    'sheetless://settings', '/auth', '/auth?next=/settings', '/first-run?next=/settings',
    '/settings/../auth', '/template/../settings', '/template/%2e%2e/setup', '/template/%2Fauth',
    '/template/hello world', '/settings\\evil', '/settings#fragment', '/unknown', '/session/not-a-uuid',
    '/templates/private/settings', '/settings\n', `/template/${'x'.repeat(201)}`, `/settings?x=${'x'.repeat(2_048)}`,
  ])('falls back to Today for an unsafe or unsupported destination %s', input => {
    expect(safeEntryDestination(input)).toBe(DEFAULT_ENTRY_DESTINATION)
  })

  it('keeps the starting-numbers handoff and strips unrelated or nested navigation input', () => {
    expect(safeEntryDestination('/settings?section=starting-numbers&next=/auth&userId=other'))
      .toBe('/settings?section=starting-numbers')
    expect(safeEntryDestination('/settings?section=account')).toBe('/settings')
    expect(safeEntryDestination('/settings?section=starting-numbers&section=account')).toBe('/settings')
  })

  it('keeps finder context but drops every account-scoped setup draft and receipt', () => {
    const path = '/template/basic-3-day/setup'
    expect(safeEntryDestination(`${path}?draftId=private&source=finder&finderDays=3&sessionId=private&accountId=other`))
      .toBe(`${path}?source=finder&finderDays=3`)
    expect(safeEntryDestination(`${path}?finderDays=3`)).toBe(path)
    expect(safeEntryDestination(`${path}?source=finder&finderDays=9`)).toBe(`${path}?source=finder`)
    expect(safeEntryDestination(`${path}?source=finder&finderDays=2&finderDays=5`)).toBe(`${path}?source=finder`)
    expect(safeEntryDestination(`/session/${sessionId}?draftId=private&next=/settings`)).toBe(`/session/${sessionId}`)
  })

  it('carries a sanitized continuation through both entry routes without nesting it', () => {
    const next = '/settings?section=starting-numbers'
    expect(getEntryDestination('/auth', { next })).toBe(next)
    expect(getEntryDestination('/first-run', { next })).toBe(next)
    expect(getEntryDestination('/auth', { next: ['/settings', '/templates'] })).toBe(DEFAULT_ENTRY_DESTINATION)
    expect(getEntryDestination('/first-run', { next: '/auth?next=/settings' })).toBe(DEFAULT_ENTRY_DESTINATION)
  })

  it('captures the current route without accepting a competing next or duplicate parameter', () => {
    expect(getEntryDestination('/settings', { section: 'starting-numbers', next: '/templates' }))
      .toBe('/settings?section=starting-numbers')
    expect(getEntryDestination('/settings', { section: ['starting-numbers'] })).toBe('/settings')
    expect(getEntryDestination('/template/basic/setup', {
      templateId: 'basic', source: 'finder', finderDays: '2', draftId: 'private', next: '/settings',
    })).toBe('/template/basic/setup?source=finder&finderDays=2')
  })
})
