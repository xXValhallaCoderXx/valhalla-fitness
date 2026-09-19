import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { restoreFullModeHint, updateSettings } from '@sheetless/data/account/profile'
import type { ExperienceMode, UserProfile } from '@sheetless/domain/account/types'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { buildUserContext } from '@/lib/account'

type ExperienceChange =
  | { experienceMode: ExperienceMode }
  | { showFormulas: boolean }
  | { restoreHints: true }

export const experienceMutationKey = (userId: string) => ['settings', userId, 'experience'] as const

/** Immediate saves use confirmed account values, never the Settings draft. */
export function useExperienceSettings(user: User, profile: UserProfile) {
  const queryClient = useQueryClient()
  const queryKey = accountQueryKeys.profile(user.id)
  const mutation = useMutation({
    mutationKey: experienceMutationKey(user.id),
    scope: { id: `account:${user.id}:profile-settings` },
    mutationFn: (change: ExperienceChange) => {
      if ('restoreHints' in change) return restoreFullModeHint(buildUserContext(user))
      // Read at execution time so a preceding settings save cannot be overwritten.
      const saved = queryClient.getQueryData<UserProfile>(queryKey) ?? profile
      return updateSettings(buildUserContext(user), {
        units: saved.units,
        rounding: saved.rounding,
        equipmentProfile: saved.equipmentProfile,
        themePreference: saved.themePreference,
        programStateDefaults: saved.programStateDefaults,
        ...change,
      })
    },
    onSuccess: (next) => {
      // A completed request must not recreate the old account cache after sign-out.
      if (queryClient.getQueryData<UserProfile>(queryKey)?.id === user.id) {
        queryClient.setQueryData(queryKey, next)
      }
    },
  })

  return {
    ...mutation,
    setMode: (experienceMode: ExperienceMode) => mutation.mutate({ experienceMode }),
    setFormulas: (showFormulas: boolean) => mutation.mutate({ showFormulas }),
    restoreHints: () => mutation.mutate({ restoreHints: true }),
    retry: () => { if (mutation.variables) mutation.mutate(mutation.variables) },
  }
}
