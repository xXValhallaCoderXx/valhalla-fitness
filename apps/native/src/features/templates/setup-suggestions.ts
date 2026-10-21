import { queryOptions } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@sheetless/domain/account/types'
import { getProgramSetupSuggestions } from '@sheetless/data/program/setup-suggestions'
import { buildUserContext } from '@/lib/account'

export function programSetupSuggestionsQueryOptions(user: User, templateId: string, profile?: Pick<UserProfile, 'units' | 'rounding' | 'programStateDefaults'>) {
  return queryOptions({
    queryKey: ['account', user.id, 'program-setup-suggestions', templateId, {
      units: profile?.units, rounding: profile?.rounding, defaults: profile?.programStateDefaults,
    }],
    queryFn: () => getProgramSetupSuggestions(buildUserContext(user), { templateId }),
    staleTime: 60_000,
  })
}
