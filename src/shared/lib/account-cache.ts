import type { QueryClient } from '@tanstack/react-query'
import { accountQueryKeys, authQueryKeys } from './query-keys'

export type AccountSubject = string | null

/**
 * Switches the cache to a new authenticated subject.
 *
 * Account queries include the subject in every key, so a late response from the
 * previous account can never satisfy a new account query. Cancelling and
 * removing the shared account root also keeps signed-out memory free of the
 * previous account's data.
 */
export async function transitionAccountCache(
  queryClient: QueryClient,
  nextSubject: AccountSubject,
): Promise<boolean> {
  const currentSubject = queryClient.getQueryData<AccountSubject>(
    authQueryKeys.accountSubject(),
  )
  if (currentSubject === nextSubject) return false

  await queryClient.cancelQueries({ queryKey: accountQueryKeys.all })
  queryClient.removeQueries({ queryKey: accountQueryKeys.all })
  queryClient.setQueryData(authQueryKeys.accountSubject(), nextSubject)
  return true
}
