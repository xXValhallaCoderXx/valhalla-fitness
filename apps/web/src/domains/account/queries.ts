import { queryOptions } from '@tanstack/react-query'
import { getAppStoreLinksFn } from '~/domains/account/server/app-links-functions'
import { fetchUserFn, getAuthPolicyFn } from '~/domains/account/server/auth-functions'
import { getBodyweightEntriesFn } from '~/domains/account/server/bodyweight-functions'
import { getExperienceSignalsFn } from '~/domains/account/server/experience-functions'
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

export const experienceSignalsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: accountQueryKeys.experienceSignals(userId),
    queryFn: () => getExperienceSignalsFn(),
    // A head-only count that moves at most once per finished workout.
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

export const appStoreLinksQueryOptions = () =>
  queryOptions({
    queryKey: publicQueryKeys.appStoreLinks(),
    queryFn: () => getAppStoreLinksFn(),
    // Deployment-level constant; fetch once and keep.
    staleTime: Infinity,
    gcTime: Infinity,
  })
