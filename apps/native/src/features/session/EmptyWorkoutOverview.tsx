import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { Button, EmptyState } from '@/components'
import { AddExerciseSheet } from './AddExerciseSheet'
import { allMovementOptionsQueryOptions } from './queries'
import { SessionNotesSheet } from './SessionNotesSheet'
import { useAddAdHocExerciseMutation } from './useAdHocExerciseMutations'

export function EmptyWorkoutOverview({
  user,
  session,
  notes,
  disabled,
  onNotesChange,
  onAdded,
}: {
  user: User
  session: WorkoutSession
  notes: string
  disabled: boolean
  onNotesChange: (notes: string) => void
  onAdded: (movementId: string) => void
}) {
  const [addOpen, setAddOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const options = useQuery({
    ...allMovementOptionsQueryOptions(user),
    enabled: addOpen && Boolean(session.isAdHoc),
  })
  const addExercise = useAddAdHocExerciseMutation({
    user,
    session,
    onAdded: (movementId) => {
      setAddOpen(false)
      if (movementId) onAdded(movementId)
    },
  })

  return (
    <>
      <EmptyState
        title={session.isAdHoc ? 'Build this workout' : 'No exercises available'}
        action={session.isAdHoc ? (
          <Button
            label="Add exercise"
            disabled={disabled}
            onPress={() => setAddOpen(true)}
            testID="empty-add-exercise"
          />
        ) : undefined}
      >
        {session.isAdHoc
          ? 'Choose anything from the movement catalogue to start logging, or finish now to keep only your session notes.'
          : 'Return to Today and refresh this planned workout.'}
      </EmptyState>

      {session.isAdHoc ? (
        <Button
          label={notes.trim() ? 'Edit session notes' : 'Session notes'}
          variant="default"
          fullWidth
          disabled={disabled}
          onPress={() => setNotesOpen(true)}
        />
      ) : null}

      <AddExerciseSheet
        open={addOpen && Boolean(session.isAdHoc)}
        options={options.data ?? []}
        freeWeightOnly={session.equipmentMode === 'free_weight'}
        isLoading={options.isPending}
        loadError={options.isError
          ? getApiErrorMessage(options.error, 'Unable to load movement options.')
          : null}
        mutationError={addExercise.isError
          ? getApiErrorMessage(addExercise.error, 'Unable to add this exercise.')
          : null}
        isPending={addExercise.isPending}
        onRetry={() => options.refetch()}
        onClose={() => setAddOpen(false)}
        onSubmit={(draft) => addExercise.mutate(draft.movement.movementId)}
      />
      <SessionNotesSheet
        open={notesOpen}
        notes={notes}
        disabled={disabled}
        onClose={() => setNotesOpen(false)}
        onSave={(nextNotes) => {
          onNotesChange(nextNotes)
          setNotesOpen(false)
        }}
      />
    </>
  )
}
