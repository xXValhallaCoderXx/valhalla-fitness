import type { QueryClient } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { isWorkoutUnavailable } from '@sheetless/domain/session/session-errors'
import { sessionQueryOptions } from '~/domains/session/queries'
import { loadRouteQuery } from '~/shared/lib/route-loading'

export async function loadSessionRoute(queryClient: QueryClient, userId: string, sessionId: string) {
  const { sessionIdInputSchema } = await import('~/domains/session/lib/schemas')
  if (!sessionIdInputSchema.safeParse({ sessionId }).success) throw notFound()
  try {
    await loadRouteQuery(queryClient, sessionQueryOptions(userId, sessionId))
  } catch (error) {
    if (isWorkoutUnavailable(error)) throw notFound()
    throw error
  }
}
