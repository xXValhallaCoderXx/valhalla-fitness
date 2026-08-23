import { useState } from 'react'
import { useIsMutating, useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import type { User } from '@supabase/supabase-js'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import { Button, EmptyState, PageHeader, Screen } from '@/components'
import { AddExerciseSheet } from './AddExerciseSheet'
import { allMovementOptionsQueryOptions } from './queries'
import { SessionNotesSheet } from './SessionNotesSheet'
import { useAddAdHocExerciseMutation } from './useAdHocExerciseMutations'
import { useDiscardWorkout } from './useDiscardWorkout'
import { useFinishSession } from './useFinishSession'
import { WorkoutLifecycleSheets } from './WorkoutLifecycleSheets'
import { WorkoutToolsPanel } from './WorkoutToolsPanel'

export function EmptyWorkoutView({
  user,
  session,
  notes,
  onNotesChange,
}: {
  user: User
  session: WorkoutSession
  notes: string
  onNotesChange: (notes: string) => void
}) {
  const [addOpen, setAddOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const activeSessionMutations = useIsMutating({
    predicate: (mutation) => mutation.options.scope?.id === `session:${session.sessionId}`,
  })
  const busy = activeSessionMutations > 0
  const options = useQuery({
    ...allMovementOptionsQueryOptions(user),
    enabled: addOpen && Boolean(session.isAdHoc),
  })
  const addExercise = useAddAdHocExerciseMutation({ user, session })
  const discard = useDiscardWorkout(user, session.sessionId, () => setDiscardOpen(false))
  const finish = useFinishSession(user, session, notes)
  const optionsError = options.error instanceof Error ? options.error.message : null
  const addError = addExercise.error instanceof Error ? addExercise.error.message : null

  return (
    <Screen>
      <PageHeader title={session.title} subtitle="This workout has no exercises yet." />
      <EmptyState
        title={session.isAdHoc ? 'Build this workout' : 'No movements available'}
        action={
          session.isAdHoc ? (
            <Button
              label="Add exercise"
              disabled={busy}
              onPress={() => setAddOpen(true)}
              testID="empty-add-exercise"
            />
          ) : undefined
        }
      >
        {session.isAdHoc
          ? 'Choose anything from the movement catalogue to start logging, or finish now to keep only your session notes.'
          : 'Return to Today and refresh the planned workout.'}
      </EmptyState>

      {session.isAdHoc ? (
        <WorkoutToolsPanel
          isAdHoc
          hasNotes={Boolean(notes.trim())}
          disabled={busy}
          onAddMovement={() => setAddOpen(true)}
          onNotes={() => setNotesOpen(true)}
        />
      ) : null}

      {session.isAdHoc ? (
        <Button
          label="Finish workout"
          fullWidth
          disabled={busy}
          onPress={() => setFinishOpen(true)}
          testID="empty-finish-workout"
        />
      ) : null}
      <Button
        label="Back to Today"
        variant="default"
        fullWidth
        disabled={busy}
        onPress={() => router.replace('/(tabs)')}
      />
      <Button
        label="Discard workout"
        variant="light"
        tone="danger"
        fullWidth
        disabled={busy}
        onPress={() => setDiscardOpen(true)}
      />

      <AddExerciseSheet
        open={addOpen && Boolean(session.isAdHoc)}
        options={options.data ?? []}
        freeWeightOnly={session.equipmentMode === 'free_weight'}
        isLoading={options.isPending}
        loadError={optionsError}
        mutationError={addError}
        isPending={addExercise.isPending}
        onRetry={() => options.refetch()}
        onClose={() => setAddOpen(false)}
        onSubmit={(draft) => addExercise.mutate(draft.movement.movementId)}
      />
      <SessionNotesSheet
        open={notesOpen}
        notes={notes}
        disabled={busy}
        onClose={() => setNotesOpen(false)}
        onSave={(nextNotes) => {
          onNotesChange(nextNotes)
          setNotesOpen(false)
        }}
      />
      <WorkoutLifecycleSheets
        session={session}
        discardOpen={discardOpen}
        discardPending={discard.isPending}
        discardError={discard.error instanceof Error ? discard.error.message : null}
        onDiscard={() => {
          if (!busy) discard.mutate()
        }}
        onCloseDiscard={() => setDiscardOpen(false)}
        finishOpen={finishOpen}
        finishPending={finish.isPending}
        finishError={finish.errorMessage}
        finishBlocked={busy}
        incompleteSetCount={0}
        onFinish={finish.mutate}
        onCloseFinish={() => setFinishOpen(false)}
      />
    </Screen>
  )
}
