import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { MovementSlot, SetLog, WorkoutSession } from '@sheetless/domain/session/types/session'
import {
  getMovementSwapControl,
  phaseScopeLabel,
  seedLoadForSet,
} from '@sheetless/domain/session/live-session-utils'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import {
  accessoryMovementOptionsQueryOptions,
  allMovementOptionsQueryOptions,
  movementSwapOptionsQueryOptions,
} from '../queries'
import type { MovementSwapDraft } from './MovementSwapSheet'
import type { AddAccessoryDraft } from './AddAccessorySheet'
import type { AddExerciseDraft } from './AddExerciseSheet'
import { useMovementSwapMutation } from './useMovementSwapMutation'
import {
  useAddSessionAccessoryMutation,
  useRemoveSessionAccessoryMutation,
} from './useProgramAccessoryMutations'
import {
  useAddAdHocExerciseMutation,
  useRemoveAdHocExerciseMutation,
} from './useAdHocExerciseMutations'

export function useWorkoutManagement({
  user,
  session,
  movement,
  selectedSet,
  notes,
  disabled,
  onNotesChange,
  onSelectMovement,
  onAddedMovement,
}: {
  user: User
  session: WorkoutSession
  movement: MovementSlot
  selectedSet?: SetLog
  notes: string
  disabled: boolean
  onNotesChange: (notes: string) => void
  onSelectMovement: (movementId: string | null) => void
  onAddedMovement?: (movementId: string) => void
}) {
  const [swapOpen, setSwapOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [removalTarget, setRemovalTarget] = useState<MovementSlot | null>(null)
  const [notesOpen, setNotesOpen] = useState(false)
  const [platesOpen, setPlatesOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const isAdHoc = Boolean(session.isAdHoc)
  const phaseLabel = phaseScopeLabel(session)
  const swapControl = getMovementSwapControl(movement)

  const swapOptions = useQuery({
    ...movementSwapOptionsQueryOptions(user, session.sessionId, movement.id),
    enabled: swapOpen && !swapControl.disabled,
  })
  const accessoryOptions = useQuery({
    ...accessoryMovementOptionsQueryOptions(user),
    enabled: addOpen && !isAdHoc,
  })
  const allMovementOptions = useQuery({
    ...allMovementOptionsQueryOptions(user),
    enabled: addOpen && isAdHoc,
  })

  const selectedRemovalTarget = removalTarget ?? movement
  const selectAfterRemoval = (nextSession: WorkoutSession) => {
    const removedIndex = session.movements.findIndex((item) => item.id === selectedRemovalTarget.id)
    const nextIndex = Math.min(Math.max(removedIndex, 0), nextSession.movements.length - 1)
    onSelectMovement(nextSession.movements[nextIndex]?.id ?? null)
    setRemoveOpen(false)
    setRemovalTarget(null)
  }

  const swap = useMovementSwapMutation({
    user,
    session,
    movement,
    onSwapped: () => setSwapOpen(false),
  })
  const addAccessory = useAddSessionAccessoryMutation({
    user,
    session,
    onAdded: (movementId) => {
      if (movementId) (onAddedMovement ?? onSelectMovement)(movementId)
      setAddOpen(false)
    },
  })
  const removeAccessory = useRemoveSessionAccessoryMutation({
    user,
    session,
    movement: selectedRemovalTarget,
    onRemoved: selectAfterRemoval,
  })
  const addAdHoc = useAddAdHocExerciseMutation({
    user,
    session,
    onAdded: (movementId) => {
      if (movementId) (onAddedMovement ?? onSelectMovement)(movementId)
      setAddOpen(false)
    },
  })
  const removeAdHoc = useRemoveAdHocExerciseMutation({
    user,
    session,
    movement: selectedRemovalTarget,
    onRemoved: selectAfterRemoval,
  })

  const mutationError = (error: unknown, fallback: string) =>
    error ? getApiErrorMessage(error, fallback) : null

  return {
    movementTools: {
      disabled,
      swapDisabled: swapControl.disabled,
      swapDisabledReason: swapControl.title,
      showRemove: isAdHoc || Boolean(movement.isAdded),
      removeDisabled: disabled,
      onSwap: () => setSwapOpen(true),
      onPlates: () => setPlatesOpen(true),
      onHistory: () => setHistoryOpen(true),
      onRemove: () => {
        setRemovalTarget(movement)
        setRemoveOpen(true)
      },
    },
    workoutTools: {
      isAdHoc,
      hasNotes: Boolean(notes.trim()),
      disabled,
      onAddMovement: () => setAddOpen(true),
      onNotes: () => setNotesOpen(true),
    },
    overviewTools: {
      onRemoveMovement: (target: MovementSlot) => {
        setRemovalTarget(target)
        setRemoveOpen(true)
      },
    },
    sheets: {
      swap: {
        open: swapOpen,
        movement,
        options: swapOptions.data ?? [],
        isAdHoc,
        phaseLabel,
        isLoading: swapOptions.isPending,
        loadError: mutationError(swapOptions.error, 'Unable to load movement alternatives.'),
        isPending: swap.isPending,
        mutationError: mutationError(swap.error, 'Unable to swap this movement.'),
        onRetry: () => swapOptions.refetch(),
        onClose: () => setSwapOpen(false),
        onSubmit: (draft: MovementSwapDraft) => swap.mutate(draft),
      },
      addAccessory: {
        open: addOpen && !isAdHoc,
        options: accessoryOptions.data ?? [],
        phaseLabel,
        freeWeightOnly: session.equipmentMode === 'free_weight',
        isLoading: accessoryOptions.isPending,
        loadError: mutationError(accessoryOptions.error, 'Unable to load accessory movements.'),
        isPending: addAccessory.isPending,
        mutationError: mutationError(addAccessory.error, 'Unable to add this accessory.'),
        onRetry: () => accessoryOptions.refetch(),
        onClose: () => setAddOpen(false),
        onSubmit: (draft: AddAccessoryDraft) =>
          addAccessory.mutate({
            movementId: draft.movement.movementId,
            progressionMethod: draft.progressionMethod,
            repTarget: draft.repTarget,
            scope: draft.scope,
            note: draft.note,
          }),
      },
      addExercise: {
        open: addOpen && isAdHoc,
        options: allMovementOptions.data ?? [],
        freeWeightOnly: session.equipmentMode === 'free_weight',
        isLoading: allMovementOptions.isPending,
        loadError: mutationError(allMovementOptions.error, 'Unable to load movement options.'),
        isPending: addAdHoc.isPending,
        mutationError: mutationError(addAdHoc.error, 'Unable to add this exercise.'),
        onRetry: () => allMovementOptions.refetch(),
        onClose: () => setAddOpen(false),
        onSubmit: (draft: AddExerciseDraft) => addAdHoc.mutate(draft.movement.movementId),
      },
      remove: {
        open: removeOpen,
        movementName: selectedRemovalTarget.performedMovementName ?? selectedRemovalTarget.movementName,
        kind: isAdHoc ? 'ad_hoc' as const : 'added_accessory' as const,
        allowPhaseScope: !isAdHoc && selectedRemovalTarget.addedScope === 'phase_slot',
        phaseLabel,
        isPending: isAdHoc ? removeAdHoc.isPending : removeAccessory.isPending,
        error: mutationError(
          isAdHoc ? removeAdHoc.error : removeAccessory.error,
          'Unable to remove this movement.',
        ),
        onClose: () => {
          setRemoveOpen(false)
          setRemovalTarget(null)
        },
        onConfirm: (scope: 'session' | 'phase_slot') => {
          if (isAdHoc) removeAdHoc.mutate()
          else removeAccessory.mutate(scope)
        },
      },
      notes: {
        open: notesOpen,
        notes,
        disabled,
        onClose: () => setNotesOpen(false),
        onSave: (nextNotes: string) => {
          onNotesChange(nextNotes)
          setNotesOpen(false)
        },
      },
      plates: {
        open: platesOpen,
        units: session.units,
        movementName: movement.performedMovementName ?? movement.movementName,
        initialTarget: selectedSet ? (seedLoadForSet(movement, selectedSet) ?? 0) : 0,
        onClose: () => setPlatesOpen(false),
      },
      history: {
        open: historyOpen,
        movementId: movement.performedMovementId ?? movement.movementId,
        movementName: movement.performedMovementName ?? movement.movementName,
        user,
        onClose: () => setHistoryOpen(false),
      },
    },
  }
}

export type WorkoutManagementController = ReturnType<typeof useWorkoutManagement>
