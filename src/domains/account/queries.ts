import { queryOptions } from '@tanstack/react-query'
import { fetchUserFn, getAuthPolicyFn } from '~/domains/account/server/auth-functions'
import { getBodyweightEntriesFn } from '~/domains/account/server/bodyweight-functions'
import { getMeFn } from '~/domains/account/server/profile-functions'
import { queryStaleTimes } from '~/shared/lib/query-stale-times'
import { accountQueryKeys, authQueryKeys, publicQueryKeys } from '~/shared/lib/query-keys'

export const authUserQueryOptions = () =>
  queryOptions({
    queryKey: authQueryKeys.user(),
    queryFn: () => fetchUserFn(),
    staleTime: queryStaleTimes.auth,
    gcTime: 30 * 60_000,
  })

export const meQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: accountQueryKeys.profile(userId),
    queryFn: () => getMeFn(),
    staleTime: queryStaleTimes.profile,
    gcTime: 30 * 60_000,
  })

export const bodyweightEntriesQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: accountQueryKeys.bodyweight(userId),
    queryFn: () => getBodyweightEntriesFn(),
    staleTime: queryStaleTimes.profile,
    gcTime: 30 * 60_000,
  })

export const authPolicyQueryOptions = () =>
  queryOptions({
    queryKey: publicQueryKeys.authPolicy(),
    queryFn: () => getAuthPolicyFn(),
    // Environment-level constant for the deployment; fetch once and keep.
    staleTime: Infinity,
    gcTime: Infinity,
  })
