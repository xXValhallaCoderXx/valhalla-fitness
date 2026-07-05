import { queryOptions } from '@tanstack/react-query'
import { fetchUserFn, getAuthPolicyFn } from '~/domains/account/server/auth-functions'
import { getBodyweightEntriesFn } from '~/domains/account/server/bodyweight-functions'
import { getMeFn } from '~/domains/account/server/profile-functions'
import { queryStaleTimes } from '~/shared/lib/query-stale-times'

export const authUserQueryOptions = () =>
  queryOptions({
    queryKey: ['auth', 'user'],
    queryFn: () => fetchUserFn(),
    staleTime: queryStaleTimes.auth,
    gcTime: 30 * 60_000,
  })

export const meQueryOptions = () =>
  queryOptions({
    queryKey: ['me'],
    queryFn: () => getMeFn(),
    staleTime: queryStaleTimes.profile,
    gcTime: 30 * 60_000,
  })

export const bodyweightEntriesQueryOptions = () =>
  queryOptions({
    queryKey: ['bodyweight'],
    queryFn: () => getBodyweightEntriesFn(),
    staleTime: queryStaleTimes.profile,
    gcTime: 30 * 60_000,
  })

export const authPolicyQueryOptions = () =>
  queryOptions({
    queryKey: ['auth', 'policy'],
    queryFn: () => getAuthPolicyFn(),
    // Environment-level constant for the deployment; fetch once and keep.
    staleTime: Infinity,
    gcTime: Infinity,
  })
