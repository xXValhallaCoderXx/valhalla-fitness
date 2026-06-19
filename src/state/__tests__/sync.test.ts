import { describe, expect, it } from 'vitest'
import { chooseSyncDirection } from '../sync'

describe('sync direction', () => {
  it('pushes when no remote document exists', () => {
    expect(chooseSyncDirection('2026-06-18T01:00:00.000Z', null)).toBe('push')
  })

  it('pulls when the remote document is newer', () => {
    expect(chooseSyncDirection('2026-06-18T01:00:00.000Z', '2026-06-18T02:00:00.000Z')).toBe('pull')
  })

  it('does nothing when timestamps match', () => {
    expect(chooseSyncDirection('2026-06-18T01:00:00.000Z', '2026-06-18T01:00:00.000Z')).toBe('noop')
  })
})
