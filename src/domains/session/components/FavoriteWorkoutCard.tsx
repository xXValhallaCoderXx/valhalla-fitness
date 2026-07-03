import { ActionIcon, Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Play, Star } from 'lucide-react'
import { Caption, Panel, Text } from '~/components'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { formatRelativeTime } from '~/shared/lib/dates'
import { setSessionFavoriteFn } from '~/domains/session/server/favorite-functions'
import { startAdHocSessionFn } from '~/domains/session/server/session-functions'
import type { FavoriteWorkout } from '~/shared/types'

/** A favourited ad-hoc workout on the Plans page — start a fresh copy or unfavourite it. */
export function FavoriteWorkoutCard({
  workout,
  activeSessionId,
}: {
  workout: FavoriteWorkout
  activeSessionId: string | null
}) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const startMutation = useMutation({
    mutationFn: () =>
      startAdHocSessionFn({
        data: { clientMutationId: crypto.randomUUID(), sourceSessionId: workout.sessionId },
      }),
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not start workout',
        message: getApiErrorMessage(error, 'Unable to start this workout.'),
      })
    },
    onSuccess: async (session) => {
      queryClient.setQueryData(['session', session.sessionId], session)
      await queryClient.invalidateQueries({ queryKey: ['today'] })
      await router.navigate({ to: '/sessions/$sessionId', params: { sessionId: session.sessionId } })
    },
  })

  const unfavoriteMutation = useMutation({
    mutationFn: () =>
      setSessionFavoriteFn({ data: { sessionId: workout.sessionId, favorite: false } }),
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not update favourites',
        message: getApiErrorMessage(error, 'Unable to remove this favourite.'),
      })
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['favoriteWorkouts'] }),
        queryClient.invalidateQueries({ queryKey: ['history'] }),
      ])
      notifications.show({
        color: 'success',
        title: 'Removed from favourites',
        message: `${workout.title} stays in your session history.`,
      })
    },
  })

  const start = () => {
    if (activeSessionId) {
      notifications.show({
        color: 'warning',
        title: 'Workout already in progress',
        message: 'Finish your current workout first.',
      })
      void router.navigate({ to: '/sessions/$sessionId', params: { sessionId: activeSessionId } })
      return
    }
    startMutation.mutate()
  }

  return (
    <Panel p="md" className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Text fw={900} truncate>{workout.title}</Text>
          <Caption mt={2} lineClamp={2}>
            {workout.movementNames.length ? workout.movementNames.join(' · ') : 'No exercises recorded'}
          </Caption>
        </div>
        <ActionIcon
          aria-label="Remove from favourites"
          size="md"
          radius="xl"
          variant="subtle"
          color="accent"
          loading={unfavoriteMutation.isPending}
          onClick={() => unfavoriteMutation.mutate()}
        >
          <Star size={16} fill="currentColor" />
        </ActionIcon>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3">
        <Caption>
          {workout.movementCount} exercise{workout.movementCount === 1 ? '' : 's'} · {workout.setCount} sets
          {workout.completedAt ? ` · last ${formatRelativeTime(workout.completedAt)}` : ''}
        </Caption>
        <Button
          size="compact-sm"
          className="shrink-0"
          aria-label={`Start ${workout.title}`}
          loading={startMutation.isPending}
          onClick={start}
        >
          <Play size={14} />
          Start
        </Button>
      </div>
    </Panel>
  )
}
