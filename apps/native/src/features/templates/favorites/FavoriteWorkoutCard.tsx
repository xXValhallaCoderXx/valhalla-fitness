import { View } from 'react-native'
import { Play, Star } from 'lucide-react-native'
import type { User } from '@supabase/supabase-js'
import type { FavoriteWorkout } from '@sheetless/domain/session/types/read-models'
import { formatCompactDate } from '@sheetless/domain/shared/dates'
import { Button, Caption, Panel, Text } from '@/components'
import { useSessionFavorite } from '@/features/session/summary/useSessionFavorite'
import { spacing, useTokens } from '@/lib/tokens'
import { useFavoriteWorkoutEntry } from './useFavoriteWorkoutEntry'

export function FavoriteWorkoutCard({
  user,
  workout,
  activeSessionCheckPending,
}: {
  user: User
  workout: FavoriteWorkout
  activeSessionCheckPending: boolean
}) {
  const { theme } = useTokens()
  const entry = useFavoriteWorkoutEntry(user, workout.sessionId)
  const favorite = useSessionFavorite(user)
  const error = entry.error ?? (favorite.isError
      ? favorite.error instanceof Error
        ? favorite.error.message
        : 'Unable to remove this favourite.'
      : null)

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
          disabled={entry.busy}
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
          label={entry.error ? 'Retry start' : 'Start'}
          loading={entry.busy}
          disabled={favorite.isPending || entry.activeStarts > 0 || activeSessionCheckPending}
          accessibilityLabel={`Start ${workout.title}`}
          leftSection={<Play color={theme.primaryFillText} size={15} />}
          onPress={() => void entry.startWorkout()}
          testID={`start-favorite-${workout.sessionId}`}
        />
      </View>
      {error ? <Text size="sm" tone="danger">{error}</Text> : null}
    </Panel>
  )
}
