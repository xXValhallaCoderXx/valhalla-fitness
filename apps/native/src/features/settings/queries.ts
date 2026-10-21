import { queryOptions } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { getExperienceSignals } from '@sheetless/data/account/experience'
import { getBodyweightEntries } from '@sheetless/data/account/bodyweight'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { queryStaleTimes } from '@sheetless/domain/shared/query-stale-times'
import { buildUserContext } from '@/lib/account'

export const experienceSignalsQueryOptions = (user: User) => queryOptions({
  queryKey: accountQueryKeys.experienceSignals(user.id),
  queryFn: () => getExperienceSignals(buildUserContext(user)),
  staleTime: queryStaleTimes.profile,
})

export const settingsBodyweightQueryOptions = (user: User) => queryOptions({
  queryKey: accountQueryKeys.bodyweight(user.id),
  queryFn: () => getBodyweightEntries(buildUserContext(user)),
  staleTime: queryStaleTimes.profile,
})
