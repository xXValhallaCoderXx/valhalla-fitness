import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import {
  invalidateProgramOverviewBestEffort,
  invalidateProgramStateBestEffort,
  patchProgramHasActiveSession,
  seedActiveProgram,
} from '../src/features/program/program-cache'

const userId = 'user-a'
const program = { id: 'program-1', status: 'active' } as never

describe('patchProgramHasActiveSession', () => {
  it('patches the flag without disturbing the rest of the overview', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(accountQueryKeys.programOverview(userId), {
      hasActiveSession: false,
      weekNumber: 3,
    })

    patchProgramHasActiveSession(queryClient, userId, true)

    expect(queryClient.getQueryData(accountQueryKeys.programOverview(userId))).toEqual({
      hasActiveSession: true,
      weekNumber: 3,
    })
  })

  it('does not invent an overview when nothing is cached yet', () => {
    const queryClient = new QueryClient()
    patchProgramHasActiveSession(queryClient, userId, true)
    expect(queryClient.getQueryData(accountQueryKeys.programOverview(userId))).toBeUndefined()
  })

  it('leaves another account’s overview alone', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(accountQueryKeys.programOverview('user-b'), { hasActiveSession: false })

    patchProgramHasActiveSession(queryClient, userId, true)

    expect(queryClient.getQueryData(accountQueryKeys.programOverview('user-b'))).toEqual({
      hasActiveSession: false,
    })
  })
})

describe('seedActiveProgram', () => {
  it('seeds the active program and folds it into an existing overview', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(accountQueryKeys.programOverview(userId), { hasActiveSession: false })

    seedActiveProgram(queryClient, userId, program)

    expect(queryClient.getQueryData(accountQueryKeys.activeProgram(userId))).toBe(program)
    expect(queryClient.getQueryData(accountQueryKeys.programOverview(userId))).toEqual({
      hasActiveSession: false,
      activeProgram: program,
    })
  })

  it('still seeds the active program when no overview is cached', () => {
    const queryClient = new QueryClient()
    seedActiveProgram(queryClient, userId, program)
    expect(queryClient.getQueryData(accountQueryKeys.activeProgram(userId))).toBe(program)
    expect(queryClient.getQueryData(accountQueryKeys.programOverview(userId))).toBeUndefined()
  })
})

describe('best-effort invalidation', () => {
  it('resolves even when a refetch rejects, so a caller’s success path is never blocked', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
    await expect(
      queryClient.fetchQuery({
        queryKey: accountQueryKeys.programOverview(userId),
        queryFn: () => Promise.resolve({ hasActiveSession: false }),
      }),
    ).resolves.toBeDefined()
    queryClient.setQueryDefaults(accountQueryKeys.programOverview(userId), {
      queryFn: () => Promise.reject(new Error('offline')),
    })

    await expect(invalidateProgramOverviewBestEffort(queryClient, userId)).resolves.toBeUndefined()
  })

  it('marks both the program and today caches stale', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(accountQueryKeys.activeProgram(userId), program)
    queryClient.setQueryData(accountQueryKeys.today(userId), { activeSession: null })

    await invalidateProgramStateBestEffort(queryClient, userId)

    expect(queryClient.getQueryState(accountQueryKeys.activeProgram(userId))?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(accountQueryKeys.today(userId))?.isInvalidated).toBe(true)
  })
})
