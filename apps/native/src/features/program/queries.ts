import { queryOptions } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { getProgramOverview } from '@sheetless/data/history/history'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { queryStaleTimes } from '@sheetless/domain/shared/query-stale-times'
import { buildUserContext } from '@/lib/account'

export function programOverviewQueryOptions(user: User) {
  return queryOptions({
    queryKey: accountQueryKeys.programOverview(user.id),
    queryFn: async () => {
      const overview = await getProgramOverview(buildUserContext(user))
      if (overview.activeProgram && !overview.activeProgram.templateDefinition) {
        throw new Error('Program definition unavailable')
      }
      return overview
    },
    staleTime: queryStaleTimes.program,
  })
}
