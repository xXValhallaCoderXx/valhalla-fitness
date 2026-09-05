import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import {
  invalidateSessionManagementCaches,
  updateSessionManagementCaches,
} from '../src/features/session/session-management-cache'

const userId = 'user-a'
const session = (overrides: Record<string, unknown> = {}) =>
  ({ sessionId: 'session-1', status: 'in_progress', title: 'Upper A', ...overrides }) as never

describe('updateSessionManagementCaches', () => {
  it('writes the session and plants it as Today’s active session', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(accountQueryKeys.today(userId), { activeSession: null })
    const next = session()

    updateSessionManagementCaches(queryClient, userId, next)

    expect(queryClient.getQueryData(accountQueryKeys.session(userId, 'session-1'))).toBe(next)
    expect(queryClient.getQueryData(accountQueryKeys.today(userId))).toEqual({ activeSession: next })
  })

  it('refreshes Today when the same session is already active', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(accountQueryKeys.today(userId), {
      activeSession: session({ title: 'stale' }),
    })
    const next = session({ title: 'Upper A' })

    updateSessionManagementCaches(queryClient, userId, next)

    expect(queryClient.getQueryData(accountQueryKeys.today(userId))).toEqual({ activeSession: next })
  })

  it('does not displace a different in-progress session on Today', () => {
    const queryClient = new QueryClient()
    const active = session({ sessionId: 'session-other' })
    queryClient.setQueryData(accountQueryKeys.today(userId), { activeSession: active })

    updateSessionManagementCaches(queryClient, userId, session())

    expect(queryClient.getQueryData(accountQueryKeys.today(userId))).toEqual({ activeSession: active })
  })

  it('does not re-plant a finished session as active', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(accountQueryKeys.today(userId), { activeSession: null })
    const finished = session({ status: 'completed' })

    updateSessionManagementCaches(queryClient, userId, finished)

    expect(queryClient.getQueryData(accountQueryKeys.session(userId, 'session-1'))).toBe(finished)
    expect(queryClient.getQueryData(accountQueryKeys.today(userId))).toEqual({ activeSession: null })
  })

  it('does not invent a Today payload when none is cached', () => {
    const queryClient = new QueryClient()
    updateSessionManagementCaches(queryClient, userId, session())
    expect(queryClient.getQueryData(accountQueryKeys.today(userId))).toBeUndefined()
  })
})

describe('invalidateSessionManagementCaches', () => {
  const seed = (queryClient: QueryClient) => {
    queryClient.setQueryData(accountQueryKeys.session(userId, 'session-1'), session())
    queryClient.setQueryData(accountQueryKeys.today(userId), { activeSession: null })
    queryClient.setQueryData(accountQueryKeys.activeProgram(userId), { id: 'program-1' })
  }

  it('invalidates the session and today caches, leaving the programme alone', async () => {
    const queryClient = new QueryClient()
    seed(queryClient)

    await invalidateSessionManagementCaches({
      queryClient,
      userId,
      sessionId: 'session-1',
      includeProgram: false,
    })

    expect(queryClient.getQueryState(accountQueryKeys.session(userId, 'session-1'))?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(accountQueryKeys.today(userId))?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(accountQueryKeys.activeProgram(userId))?.isInvalidated).toBe(false)
  })

  it('also invalidates the programme when asked', async () => {
    const queryClient = new QueryClient()
    seed(queryClient)

    await invalidateSessionManagementCaches({
      queryClient,
      userId,
      sessionId: 'session-1',
      includeProgram: true,
    })

    expect(queryClient.getQueryState(accountQueryKeys.activeProgram(userId))?.isInvalidated).toBe(true)
  })
})
