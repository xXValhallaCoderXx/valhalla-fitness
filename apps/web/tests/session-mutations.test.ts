import { describe, expect, it } from 'vitest'
import { isSessionMutationKey } from '~/domains/session/lib/session-mutations'

describe('isSessionMutationKey', () => {
  it('matches writes that must settle before a workout transition', () => {
    expect(isSessionMutationKey(['setLog', 'session-1', 'movement-1', 1], 'session-1')).toBe(true)
    expect(isSessionMutationKey(['finishSession', 'session-1'], 'session-1')).toBe(true)
    expect(isSessionMutationKey(['discardSession', 'session-1'], 'session-1')).toBe(true)
  })

  it('ignores other sessions and non-session mutations', () => {
    expect(isSessionMutationKey(['setLog', 'session-2'], 'session-1')).toBe(false)
    expect(isSessionMutationKey(['today'], 'session-1')).toBe(false)
    expect(isSessionMutationKey(undefined, 'session-1')).toBe(false)
  })
})
