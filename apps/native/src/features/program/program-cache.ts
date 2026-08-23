import type { QueryClient } from '@tanstack/react-query'
import type { ProgramInstance, ProgramOverview } from '@sheetless/domain/program/types'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'

export function patchProgramHasActiveSession(
  queryClient: QueryClient,
  userId: string,
  hasActiveSession: boolean,
) {
  queryClient.setQueryData<ProgramOverview>(
    accountQueryKeys.programOverview(userId),
    (current) => current ? { ...current, hasActiveSession } : current,
  )
}

export function seedActiveProgram(
  queryClient: QueryClient,
  userId: string,
  program: ProgramInstance,
) {
  queryClient.setQueryData(accountQueryKeys.activeProgram(userId), program)
  queryClient.setQueryData<ProgramOverview>(
    accountQueryKeys.programOverview(userId),
    (current) => current ? { ...current, activeProgram: program } : current,
  )
}

export async function invalidateProgramStateBestEffort(
  queryClient: QueryClient,
  userId: string,
) {
  await Promise.allSettled([
    queryClient.invalidateQueries({ queryKey: accountQueryKeys.program(userId) }),
    queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(userId) }),
  ])
}

export async function invalidateProgramOverviewBestEffort(
  queryClient: QueryClient,
  userId: string,
) {
  await Promise.allSettled([
    queryClient.invalidateQueries({
      queryKey: accountQueryKeys.programOverview(userId),
    }),
  ])
}
