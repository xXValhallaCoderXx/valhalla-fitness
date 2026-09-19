import { View } from 'react-native'
import { router } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { getExperienceSignals } from '@sheetless/data/account/experience'
import { dismissFullModeHint } from '@sheetless/data/account/profile'
import { fullModeHintCopy, shouldOfferFullMode } from '@sheetless/domain/account/experience-mode'
import type { UserProfile } from '@sheetless/domain/account/types'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { Button, Caption, Panel, Text } from '@/components'
import { buildUserContext } from '@/lib/account'
import { spacing, useTokens } from '@/lib/tokens'

export function FullModeHint({ user, profile }: { user: User; profile: UserProfile }) {
  const { theme } = useTokens()
  const client = useQueryClient()
  const signals = useQuery({
    queryKey: accountQueryKeys.experienceSignals(user.id),
    queryFn: () => getExperienceSignals(buildUserContext(user)),
    enabled: profile.experienceMode === 'guided' && !profile.fullModeHintDismissedAt,
    staleTime: 0,
  })
  const dismiss = useMutation({
    scope: { id: `account:${user.id}:profile-settings` },
    mutationFn: (_openSettings: boolean) => dismissFullModeHint(buildUserContext(user)),
    onSuccess: (next, openSettings) => {
      // Account changes clear these queries; a late response must not restore
      // the departed account's profile or navigate its replacement account.
      if (client.getQueryData<UserProfile>(accountQueryKeys.profile(user.id))?.id !== user.id) return
      client.setQueryData(accountQueryKeys.profile(user.id), next)
      if (openSettings) router.push({ pathname: '/settings', params: { section: 'experience' } })
    },
  })
  if (!signals.isSuccess || !signals.isFetchedAfterMount || !shouldOfferFullMode({
    experienceMode: profile.experienceMode,
    fullModeHintDismissedAt: profile.fullModeHintDismissedAt,
    completedSessions: signals.data.completedSessions,
  })) return null

  return (
    <Panel style={{ backgroundColor: theme.tones.action.soft, borderColor: theme.tones.action.border, gap: spacing.sm, padding: spacing.md }}>
      <Text weight={700}>Want a little more detail?</Text>
      <Caption>You’ve logged {signals.data.completedSessions} workouts. Full mode adds technical notation and load formulas. It is always available in Settings.</Caption>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        <Button label={fullModeHintCopy.confirm} variant="subtle" disabled={dismiss.isPending} onPress={() => dismiss.mutate(true)} />
        <Button label={fullModeHintCopy.dismiss} variant="subtle" disabled={dismiss.isPending} onPress={() => dismiss.mutate(false)} />
      </View>
      {dismiss.isError ? <Text size="sm" tone="danger">{dismiss.error instanceof Error ? dismiss.error.message : 'Your choice could not save.'} Try again.</Text> : null}
    </Panel>
  )
}
