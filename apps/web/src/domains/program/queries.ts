import { queryOptions } from '@tanstack/react-query'
import {
  getActiveProgramFn,
  getProgramSetupOptionsFn,
  listTemplatesFn,
} from '~/domains/program/server/program-functions'
import { getProgramOverviewFn } from '~/domains/history/server/history-functions'
import { queryStaleTimes } from '~/shared/lib/query-stale-times'

export const templatesQueryOptions = () =>
  queryOptions({
    queryKey: ['templates'],
    queryFn: () => listTemplatesFn(),
    staleTime: queryStaleTimes.catalog,
    gcTime: 30 * 60_000,
  })

export const programSetupOptionsQueryOptions = (templateId: string) =>
  queryOptions({
    queryKey: ['programSetupOptions', templateId],
    queryFn: () => getProgramSetupOptionsFn({ data: { templateId } }),
    staleTime: queryStaleTimes.options,
    gcTime: 30 * 60_000,
  })

export const activeProgramQueryOptions = () =>
  queryOptions({
    queryKey: ['activeProgram'],
    queryFn: () => getActiveProgramFn(),
    staleTime: queryStaleTimes.program,
  })

export const programOverviewQueryOptions = () =>
  queryOptions({
    queryKey: ['programOverview'],
    queryFn: () => getProgramOverviewFn(),
    staleTime: queryStaleTimes.program,
  })
