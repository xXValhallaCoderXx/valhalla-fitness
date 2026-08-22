import { queryOptions } from '@tanstack/react-query'
import {
  getActiveProgramFn,
  getProgramSetupOptionsFn,
  listTemplatesFn,
} from '~/domains/program/server/program-functions'
import { getProgramOverviewFn } from '~/domains/history/server/history-functions'
import { queryStaleTimes } from '~/shared/lib/query-stale-times'
import { accountQueryKeys, publicQueryKeys } from '~/shared/lib/query-keys'

export const publicTemplatesQueryOptions = () =>
  queryOptions({
    queryKey: publicQueryKeys.templates(),
    queryFn: async () => {
      const templates = await listTemplatesFn()
      return templates.filter((template) => template.origin !== 'user_created')
    },
    staleTime: queryStaleTimes.catalog,
    gcTime: 30 * 60_000,
  })

export const accountTemplatesQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: accountQueryKeys.templates(userId),
    queryFn: () => listTemplatesFn(),
    staleTime: queryStaleTimes.catalog,
    gcTime: 30 * 60_000,
  })

export const availableTemplatesQueryOptions = (userId: string | null) =>
  queryOptions({
    queryKey: userId
      ? accountQueryKeys.templates(userId)
      : publicQueryKeys.templates(),
    queryFn: async () => {
      const templates = await listTemplatesFn()
      return userId
        ? templates
        : templates.filter((template) => template.origin !== 'user_created')
    },
    staleTime: queryStaleTimes.catalog,
    gcTime: 30 * 60_000,
  })

export const publicProgramSetupOptionsQueryOptions = (templateId: string) =>
  queryOptions({
    queryKey: publicQueryKeys.programSetupOptions(templateId),
    queryFn: () => getProgramSetupOptionsFn({ data: { templateId } }),
    staleTime: queryStaleTimes.options,
    gcTime: 30 * 60_000,
  })

export const availableProgramSetupOptionsQueryOptions = (
  userId: string | null,
  templateId: string,
) =>
  queryOptions({
    queryKey: userId
      ? accountQueryKeys.programSetupOptions(userId, templateId)
      : publicQueryKeys.programSetupOptions(templateId),
    queryFn: () => getProgramSetupOptionsFn({ data: { templateId } }),
    staleTime: queryStaleTimes.options,
    gcTime: 30 * 60_000,
  })

export const programSetupOptionsQueryOptions = (userId: string, templateId: string) =>
  queryOptions({
    queryKey: accountQueryKeys.programSetupOptions(userId, templateId),
    queryFn: () => getProgramSetupOptionsFn({ data: { templateId } }),
    staleTime: queryStaleTimes.options,
    gcTime: 30 * 60_000,
  })

export const activeProgramQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: accountQueryKeys.activeProgram(userId),
    queryFn: () => getActiveProgramFn(),
    staleTime: queryStaleTimes.program,
  })

export const programOverviewQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: accountQueryKeys.programOverview(userId),
    queryFn: () => getProgramOverviewFn(),
    staleTime: queryStaleTimes.program,
  })
