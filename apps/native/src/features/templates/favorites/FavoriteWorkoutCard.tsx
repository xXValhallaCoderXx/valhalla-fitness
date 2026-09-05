import { Alert, View } from 'react-native'
import { Play, Star } from 'lucide-react-native'
import { router } from 'expo-router'
import { useIsMutating, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { FavoriteWorkout, TodayPayload } from '@sheetless/domain/session/types/read-models'
import { formatCompactDate } from '@sheetless/domain/shared/dates'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { Button, Caption, Panel, Text } from '@/components'
import { useSessionFavorite } from '@/features/session/summary/useSessionFavorite'
import { useStartAdHocWorkout } from '@/features/session/today/useStartAdHocWorkout'
import { spacing, useTokens } from '@/lib/tokens'

export function FavoriteWorkoutCard({
  user,
  workout,
  activeSessionId,
  activeSessionCheckPending,
}: {
  user: User
  workout: FavoriteWorkout
  activeSessionId: string | null
  activeSessionCheckPending: boolean
}) {
  const { theme } = useTokens()
  const queryClient = useQueryClient()
  const activeStarts = useIsMutating({ mutationKey: ['startSession', user.id] })
  const start = useStartAdHocWorkout(user)
  const favorite = useSessionFavorite(user)
  const error = start.isError
    ? start.error instanceof Error
      ? start.error.message
      : 'Unable to start this workout.'
    : favorite.isError
      ? favorite.error instanceof Error
        ? favorite.error.message
        : 'Unable to remove this favourite.'
      : null

  const startWorkout = () => {
    start.reset()
    const cachedActiveSessionId = queryClient.getQueryData<TodayPayload>(
      accountQueryKeys.today(user.id),
    )?.activeSession?.sessionId
    const currentSessionId = activeSessionId ?? cachedActiveSessionId
    if (currentSessionId) {
      Alert.alert(
        'Workout already in progress',
        'Open your current workout before starting another one.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open workout',
            onPress: () => router.push({
              pathname: '/session/[sessionId]',
              params: { sessionId: currentSessionId },
            }),
          },
        ],
      )
      return
    }
    start.mutate({ sourceSessionId: workout.sessionId }, {
      onSuccess: (session) => router.push({
        pathname: '/session/[sessionId]',
        params: { sessionId: session.sessionId },
      }),
    })
  }

  return (
    <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
      <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
          <Text weight="800" numberOfLines={1}>{workout.title}</Text>
          <Caption numberOfLines={2}>
            {workout.movementNames.length
              ? workout.movementNames.join(' · ')
              : 'No exercises recorded'}
          </Caption>
        </View>
        <Button
          label="Remove"
          variant="subtle"
          tone="accent"
          loading={favorite.isPending}
          disabled={start.isPending}
          accessibilityLabel={`Remove ${workout.title} from favourites`}
          leftSection={<Star color={theme.tones.accent.text} fill={theme.tones.accent.text} size={15} />}
          onPress={() => {
            favorite.reset()
            favorite.mutate({ sessionId: workout.sessionId, favorite: false })
          }}
        />
      </View>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.sm }}>
        <Caption style={{ flex: 1 }}>
          {workout.movementCount} {workout.movementCount === 1 ? 'exercise' : 'exercises'} · {workout.setCount} sets
          {workout.scheduledDate ? ` · last ${formatCompactDate(workout.scheduledDate)}` : ''}
        </Caption>
        <Button
          label="Start"
          loading={start.isPending}
          disabled={favorite.isPending || activeStarts > 0 || activeSessionCheckPending}
          accessibilityLabel={`Start ${workout.title}`}
          leftSection={<Play color={theme.primaryFillText} size={15} />}
          onPress={startWorkout}
          testID={`start-favorite-${workout.sessionId}`}
        />
      </View>
      {error ? <Text size="sm" tone="danger">{error}</Text> : null}
    </Panel>
  )
}
