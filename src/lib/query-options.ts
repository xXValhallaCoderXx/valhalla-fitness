import { queryOptions } from '@tanstack/react-query'
import {
  getActiveProgramFn,
  getMeFn,
  getMovementHistoryFn,
  getRecentHistoryFn,
  getSessionFn,
  getTodayFn,
  listTemplatesFn,
} from '~/server/api'

export const meQueryOptions = () =>
  queryOptions({
    queryKey: ['me'],
    queryFn: () => getMeFn(),
  })

export const templatesQueryOptions = () =>
  queryOptions({
    queryKey: ['templates'],
    queryFn: () => listTemplatesFn(),
  })

export const activeProgramQueryOptions = () =>
  queryOptions({
    queryKey: ['activeProgram'],
    queryFn: () => getActiveProgramFn(),
  })

export const todayQueryOptions = () =>
  queryOptions({
    queryKey: ['today'],
    queryFn: () => getTodayFn(),
  })

export const sessionQueryOptions = (sessionId: string) =>
  queryOptions({
    queryKey: ['session', sessionId],
    queryFn: () => getSessionFn({ data: { sessionId } }),
  })

export const recentHistoryQueryOptions = () =>
  queryOptions({
    queryKey: ['history', 'recent'],
    queryFn: () => getRecentHistoryFn(),
  })

export const movementHistoryQueryOptions = (movementId: string) =>
  queryOptions({
    queryKey: ['history', 'movement', movementId],
    queryFn: () => getMovementHistoryFn({ data: { movementId } }),
  })
