import { View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { Button, Caption, Panel, SectionLabel } from '@/components'
import { favoriteWorkoutsQueryOptions, todayQueryOptions } from '@/features/session/queries'
import { spacing } from '@/lib/tokens'
import { FavoriteWorkoutCard } from './FavoriteWorkoutCard'

/** Independent, non-blocking favourites surface for the Programs catalogue. */
export function FavoriteWorkoutsSection({
  user,
}: {
  user: User
}) {
  const favorites = useQuery(favoriteWorkoutsQueryOptions(user))
  const today = useQuery({ ...todayQueryOptions(user),
    enabled: favorites.isSuccess && favorites.data.length > 0, staleTime: 0, refetchOnMount: 'always' })

  if (favorites.isPending) return null
  if (favorites.isError) {
    return (
      <Panel surface="inset" style={{ padding: spacing.sm }}>
        <Caption tone="warning">
          Favourites could not load. The programme library is still available.
        </Caption>
        <Button label="Retry favourites" variant="subtle" loading={favorites.isFetching} onPress={() => void favorites.refetch()} />
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
      {today.isError ? <Panel surface="inset" style={{ gap: spacing.xs, padding: spacing.sm }}>
        <Caption tone="warning">Your current workout could not be checked. Retry before starting a favourite.</Caption>
        <Button label="Retry workout check" variant="subtle" loading={today.isFetching} onPress={() => void today.refetch()} />
      </Panel> : today.isPending || today.isFetching ? <Caption>Checking your current workout…</Caption> : null}
      {favorites.data.map((workout) => (
        <FavoriteWorkoutCard
          key={`${user.id}:${workout.sessionId}`}
          user={user}
          workout={workout}
          activeSessionCheckPending={today.isPending || today.isFetching || today.isError || !today.data}
        />
      ))}
    </View>
  )
}
