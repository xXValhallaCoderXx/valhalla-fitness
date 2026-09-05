import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { UserContext } from '@sheetless/data/shared/context'
import { getMe } from '@sheetless/data/account/profile'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { queryStaleTimes } from '@sheetless/domain/shared/query-stale-times'
import { getSupabase } from '@/lib/supabase'
import { useSession } from '@/lib/session-provider'

/** The authenticated caller every @sheetless/data function takes. */
export function buildUserContext(user: User): UserContext {
  return { supabase: getSupabase() as UserContext['supabase'], user }
}

/**
 * The signed-in profile via ensureProfile-backed getMe — creates the profiles
 * row on first sign-in, mirroring the web's account bootstrap.
 */
export function useMe() {
  const { user } = useSession()
  return useQuery({
    queryKey: user ? accountQueryKeys.profile(user.id) : ['account', 'anonymous', 'profile'],
    queryFn: () => getMe(buildUserContext(user!)),
    enabled: Boolean(user),
    staleTime: queryStaleTimes.profile,
  })
}
