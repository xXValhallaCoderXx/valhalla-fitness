import { queryOptions } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { getProgramSetupOptions, listTemplates } from '@sheetless/data/program/templates'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { queryStaleTimes } from '@sheetless/domain/shared/query-stale-times'
import { buildUserContext } from '@/lib/account'

export function templatesQueryOptions(user: User) {
  return queryOptions({
    queryKey: accountQueryKeys.templates(user.id),
    queryFn: () => listTemplates(buildUserContext(user).supabase),
    staleTime: queryStaleTimes.catalog,
  })
}

export function templateSetupQueryOptions(user: User, templateId: string) {
  return queryOptions({
    queryKey: accountQueryKeys.programSetupOptions(user.id, templateId),
    queryFn: () => getProgramSetupOptions(buildUserContext(user).supabase, { templateId }),
    staleTime: queryStaleTimes.catalog,
  })
}
