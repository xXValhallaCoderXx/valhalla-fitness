import { View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { Caption, Panel, SectionLabel } from '@/components'
import { favoriteWorkoutsQueryOptions, todayQueryOptions } from '@/features/session/queries'
import { spacing } from '@/lib/tokens'
import { FavoriteWorkoutCard } from './FavoriteWorkoutCard'

/** Independent, non-blocking favourites surface for the Programs catalogue. */
export function FavoriteWorkoutsSection({
  user,
  activeSessionId,
}: {
  user: User
  activeSessionId: string | null
}) {
  const favorites = useQuery(favoriteWorkoutsQueryOptions(user))
  const today = useQuery(todayQueryOptions(user))

  if (favorites.isPending) return null
  if (favorites.isError) {
    return (
      <Panel surface="inset" style={{ padding: spacing.sm }}>
        <Caption tone="warning">
          Favourites could not load. The programme library is still available.
        </Caption>
      </Panel>
    )
  }
  if (!favorites.data.length) return null

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <SectionLabel>Favourite workouts</SectionLabel>
        <Caption>{favorites.data.length}</Caption>
      </View>
      {favorites.data.map((workout) => (
        <FavoriteWorkoutCard
          key={workout.sessionId}
          user={user}
          workout={workout}
          activeSessionId={today.data?.activeSession?.sessionId ?? activeSessionId}
          activeSessionCheckPending={today.isPending}
        />
      ))}
    </View>
  )
}
