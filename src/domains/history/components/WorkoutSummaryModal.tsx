import { Button, Modal } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { RotateCw, Star, X } from 'lucide-react'
import { useState } from 'react'
import { SectionLabel } from '~/components'
import { buildWorkoutSummary } from '~/domains/history/lib/workout-summary'
import { setSessionFavoriteFn } from '~/domains/session/server/favorite-functions'
import { startAdHocSessionFn } from '~/domains/session/server/session-functions'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import type { RecentHistoryEntry, WorkoutSession } from '~/shared/types'
import { FavoriteNameDialog } from './summary/FavoriteNameDialog'
import { ExerciseCard, NotesCard, SessionBest, StatusBlock } from './summary/WorkoutSummaryExercises'
import { WorkoutSummaryHero } from './summary/WorkoutSummaryHero'

export function WorkoutSummaryModal({
  open,
  fallback,
  session,
  isLoading,
  error,
  onClose,
}: {
  open: boolean
  fallback: RecentHistoryEntry | null
  session?: WorkoutSession
  isLoading: boolean
  error: unknown
  onClose: () => void
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [nameDialogOpen, setNameDialogOpen] = useState(false)
  const model = session ? buildWorkoutSummary(session) : null
  // Repeat/favourite only make sense for completed ad-hoc workouts — plan sessions stay plan-driven.
  const canActOnAdHoc = Boolean(session?.isAdHoc && session.status === 'completed')

  const repeatMutation = useMutation({
    mutationFn: (sourceSessionId: string) =>
      startAdHocSessionFn({ data: { clientMutationId: crypto.randomUUID(), sourceSessionId } }),
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not start workout',
        message: getApiErrorMessage(error, 'Unable to repeat this workout.'),
      })
    },
    onSuccess: async (nextSession) => {
      queryClient.setQueryData(['session', nextSession.sessionId], nextSession)
      await queryClient.invalidateQueries({ queryKey: ['today'] })
      onClose()
      await router.navigate({ to: '/sessions/$sessionId', params: { sessionId: nextSession.sessionId } })
    },
  })

  const favoriteMutation = useMutation({
    mutationFn: (input: { sessionId: string; favorite: boolean; title?: string }) =>
      setSessionFavoriteFn({ data: input }),
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not update favourites',
        message: getApiErrorMessage(error, 'Unable to update this favourite.'),
      })
    },
    onSuccess: async (nextSession, input) => {
      setNameDialogOpen(false)
      queryClient.setQueryData(['session', nextSession.sessionId], nextSession)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['history'] }),
        queryClient.invalidateQueries({ queryKey: ['favoriteWorkouts'] }),
        // Favourite state spans the workout's lineage — other cached instances change too.
        queryClient.invalidateQueries({ queryKey: ['session'] }),
      ])
      notifications.show({
        color: 'success',
        title: input.favorite ? 'Saved to favourites' : 'Removed from favourites',
        message: input.favorite
          ? `${nextSession.title} is on the Plans page, ready to run again.`
          : `${nextSession.title} is no longer a favourite.`,
      })
    },
  })

  return (
    <Modal
      opened={open}
      onClose={onClose}
      withCloseButton={false}
      padding={0}
      size="44rem"
      classNames={{
        inner: '!items-end !p-0 sm:!items-center sm:!p-4',
        content: '!mb-0 !flex !max-h-[92dvh] !w-full !flex-col !overflow-hidden !rounded-t-2xl !rounded-b-none sm:!mb-auto sm:!rounded-2xl',
        body: '!flex !min-h-0 !flex-1 !flex-col !overflow-hidden !p-0',
      }}
      styles={{
        content: {
          border: '1px solid var(--mantine-color-default-border)',
          backgroundColor: 'var(--mantine-color-default)',
          color: 'var(--mantine-color-text)',
        },
        body: { color: 'var(--mantine-color-text)' },
      }}
    >
      <div className="flex-none">
        <div className="flex justify-center pb-1 pt-2 sm:hidden">
          <span className="h-1 w-9 rounded-full" style={{ backgroundColor: 'var(--mantine-color-default-border)' }} />
        </div>
        <div
          className="flex items-center justify-between px-4 py-3 sm:px-5"
          style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
        >
          <SectionLabel>Workout summary</SectionLabel>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md"
            style={{ color: 'var(--mantine-color-dimmed)' }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <StatusBlock>Loading workout summary…</StatusBlock>
        ) : error ? (
          <StatusBlock tone="danger">{getApiErrorMessage(error, 'Unable to load workout summary')}</StatusBlock>
        ) : session && model ? (
          <>
            <WorkoutSummaryHero model={model} session={session} />
            <div className="space-y-4 px-4 py-4 sm:px-5">
              {model.sessionBest ? <SessionBest best={model.sessionBest} /> : null}
              <div>
                <SectionLabel className="mb-2">Exercises · {model.exercises.length}</SectionLabel>
                <div className="space-y-2.5">
                  {model.exercises.map((exercise) => (
                    <ExerciseCard key={exercise.id} exercise={exercise} />
                  ))}
                </div>
              </div>
              {model.notes ? <NotesCard notes={model.notes} /> : null}
            </div>
          </>
        ) : fallback ? (
          <StatusBlock>{fallback.title} is ready to review.</StatusBlock>
        ) : null}
      </div>

      <div
        className="flex-none px-4 py-3 sm:px-5"
        style={{ borderTop: '1px solid var(--mantine-color-default-border)', paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
      >
        {canActOnAdHoc && session ? (
          <div className="flex gap-2">
            <Button
              variant="default"
              className="shrink-0"
              loading={favoriteMutation.isPending}
              onClick={() =>
                session.isFavorite
                  ? favoriteMutation.mutate({ sessionId: session.sessionId, favorite: false })
                  : setNameDialogOpen(true)
              }
            >
              <Star size={16} fill={session.isFavorite ? 'currentColor' : 'none'} />
              {session.isFavorite ? 'Favourited' : 'Favourite'}
            </Button>
            <Button
              className="flex-1"
              loading={repeatMutation.isPending}
              onClick={() => repeatMutation.mutate(session.sessionId)}
            >
              <RotateCw size={16} />
              Repeat workout
            </Button>
          </div>
        ) : (
          <Button fullWidth onClick={onClose}>Done</Button>
        )}
      </div>
      {nameDialogOpen && session ? (
        <FavoriteNameDialog
          initialTitle={session.title}
          isPending={favoriteMutation.isPending}
          onCancel={() => setNameDialogOpen(false)}
          onSave={(title) => favoriteMutation.mutate({ sessionId: session.sessionId, favorite: true, title })}
        />
      ) : null}
    </Modal>
  )
}
