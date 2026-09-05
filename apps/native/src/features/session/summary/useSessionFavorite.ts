import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { setSessionFavorite } from '@sheetless/data/session/favorites'
import type { SetSessionFavoriteInput } from '@sheetless/domain/session/schemas'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { buildUserContext } from '@/lib/account'

/** Updates lineage-wide favourite state and refreshes every cache that displays it. */
export function useSessionFavorite(user: User) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['setSessionFavorite', user.id],
    mutationFn: (input: SetSessionFavoriteInput) =>
      setSessionFavorite(buildUserContext(user), input),
    onSuccess: (session) => {
      queryClient.setQueryData(
        accountQueryKeys.session(user.id, session.sessionId),
        session,
      )
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.history(user.id) }),
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.favoriteWorkouts(user.id) }),
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.sessions(user.id) }),
      ])
    },
  })
}
