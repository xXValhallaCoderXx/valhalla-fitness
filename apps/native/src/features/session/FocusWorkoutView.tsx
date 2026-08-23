import { useCallback, useMemo, useState } from 'react'
import { BackHandler } from 'react-native'
import { useIsMutating } from '@tanstack/react-query'
import { router, useFocusEffect } from 'expo-router'
import type { User } from '@supabase/supabase-js'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { PopulatedFocusWorkoutView } from './PopulatedFocusWorkoutView'
import { RenameWorkoutSheet } from './RenameWorkoutSheet'
import { useDiscardWorkout } from './useDiscardWorkout'
import { useFinishSession } from './useFinishSession'
import { WorkoutLifecycleSheets } from './WorkoutLifecycleSheets'
import { WorkoutOverviewView } from './WorkoutOverviewView'

type WorkoutMode = 'overview' | 'focus'

export function FocusWorkoutView({ user, session }: { user: User; session: WorkoutSession }) {
  const orderedMovements = useMemo(
    () => [...session.movements].sort((left, right) => left.orderIndex - right.orderIndex),
    [session.movements],
  )
  const [mode, setMode] = useState<WorkoutMode>(() =>
    session.movements.length ? 'focus' : 'overview',
  )
  const [activeMovementId, setActiveMovementId] = useState<string | null>(() =>
    orderedMovements.find((movement) => movement.sets.some((set) => !set.completed))?.id
      ?? orderedMovements[0]?.id
      ?? null,
  )
  const [notes, setNotes] = useState(session.notes ?? '')
  const [discardOpen, setDiscardOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const activeMovement = orderedMovements.find((movement) => movement.id === activeMovementId)
    ?? orderedMovements[0]
    ?? null

  const activeSessionMutations = useIsMutating({
    predicate: (mutation) => mutation.options.scope?.id === `session:${session.sessionId}`,
  })
  const sessionBusy = activeSessionMutations > 0
  const hasUnsettledSet = session.movements.some((movement) =>
    movement.sets.some((set) => set.syncState === 'saving' || set.syncState === 'syncFailed'),
  )
  const finishBlocked = sessionBusy || hasUnsettledSet
  const incompleteSetCount = session.movements.reduce(
    (count, movement) => count + movement.sets.filter((set) => !set.completed).length,
    0,
  )
  const discard = useDiscardWorkout(user, session.sessionId, () => setDiscardOpen(false))
  const finish = useFinishSession(user, session, notes)
  const showOverview = mode === 'overview' || !activeMovement
  const enterFocus = (movementId: string) => {
    setActiveMovementId(movementId)
    setMode('focus')
  }

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (sessionBusy) return true
        if (mode === 'focus' && activeMovement) {
          setMode('overview')
          return true
        }
        router.dismissTo('/(tabs)')
        return true
      })
      return () => subscription.remove()
    }, [activeMovement, mode, sessionBusy]),
  )

  return (
    <>
      {showOverview ? (
        <WorkoutOverviewView
          user={user}
          session={session}
          activeMovement={activeMovement}
          notes={notes}
          disabled={sessionBusy}
          finishDisabled={finishBlocked || (!session.isAdHoc && session.movements.length === 0)}
          onNotesChange={setNotes}
          onSelectMovement={setActiveMovementId}
          onEnterFocus={enterFocus}
          onBack={() => router.dismissTo('/(tabs)')}
          onRename={() => setRenameOpen(true)}
          onFinish={() => setFinishOpen(true)}
          onDiscard={() => setDiscardOpen(true)}
        />
      ) : (
        <PopulatedFocusWorkoutView
          user={user}
          session={session}
          activeMovementId={activeMovement.id}
          notes={notes}
          sessionBusy={sessionBusy}
          finishBlocked={finishBlocked}
          onNotesChange={setNotes}
          onSelectMovement={setActiveMovementId}
          onShowOverview={() => setMode('overview')}
          onRename={() => setRenameOpen(true)}
          onFinish={() => setFinishOpen(true)}
          onDiscard={() => setDiscardOpen(true)}
        />
      )}

      <WorkoutLifecycleSheets
        session={session}
        discardOpen={discardOpen}
        discardPending={discard.isPending}
        discardError={discard.isError
          ? getApiErrorMessage(discard.error, 'Unable to discard this workout.')
          : null}
        onDiscard={() => {
          if (!sessionBusy) discard.mutate()
        }}
        onCloseDiscard={() => setDiscardOpen(false)}
        finishOpen={finishOpen}
        finishPending={finish.isPending}
        finishError={finish.errorMessage}
        finishBlocked={finishBlocked}
        incompleteSetCount={incompleteSetCount}
        onFinish={finish.mutate}
        onCloseFinish={() => setFinishOpen(false)}
      />
      <RenameWorkoutSheet
        open={renameOpen && Boolean(session.isAdHoc)}
        user={user}
        session={session}
        onClose={() => setRenameOpen(false)}
      />
    </>
  )
}
