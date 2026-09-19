import { useCallback, useMemo, useState } from 'react'
import { BackHandler } from 'react-native'
import { useIsMutating } from '@tanstack/react-query'
import { router, useFocusEffect } from 'expo-router'
import type { User } from '@supabase/supabase-js'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import { hasUnsettledSessionSets } from '@sheetless/domain/session/session-cache'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { PopulatedFocusWorkoutView } from '../focus/PopulatedFocusWorkoutView'
import { RenameWorkoutSheet } from '../editing/RenameWorkoutSheet'
import { useDiscardWorkout } from '../lifecycle/useDiscardWorkout'
import { useFinishSession } from '../lifecycle/useFinishSession'
import { WorkoutLifecycleSheets } from '../lifecycle/WorkoutLifecycleSheets'
import { WorkoutOverviewView } from '../overview/WorkoutOverviewView'
import { useFocusSetState } from '../focus/useFocusSetState'
import { useWorkoutDrafts } from '../focus/useWorkoutDrafts'
import { UnsentSetNotice } from '../focus/UnsentSetNotice'
import { useWorkoutNavigation } from './useWorkoutNavigation'

export function FocusWorkoutView({ user, session }: { user: User; session: WorkoutSession }) {
  const orderedMovements = useMemo(
    () => [...session.movements].sort((left, right) => left.orderIndex - right.orderIndex),
    [session.movements],
  )
  const { mode, setMode, activeMovementId, setActiveMovementId, notes, setNotes, focusStore } = useWorkoutNavigation(user.id, session)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const activeMovement = orderedMovements.find((movement) => movement.id === activeMovementId)
    ?? orderedMovements[0]
    ?? null
  const focusState = useFocusSetState(session.sessionId, activeMovement, focusStore)
  const drafts = useWorkoutDrafts(user.id, session.sessionId)
  const pendingDrafts = drafts.pending(session)

  const activeSessionMutations = useIsMutating({
    predicate: (mutation) => mutation.options.scope?.id === `session:${session.sessionId}`,
  })
  const sessionBusy = activeSessionMutations > 0
  const hasUnsettledSet = hasUnsettledSessionSets(session)
  const finishBlocked = sessionBusy || hasUnsettledSet || pendingDrafts.length > 0
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
  const draftWarning = <UnsentSetNotice count={pendingDrafts.length} disabled={sessionBusy} onReview={() => {
    const pending = pendingDrafts[0]
    if (!pending) return
    focusState.selectMovementSet(pending.movement, pending.set.setIndex)
    enterFocus(pending.movement.id)
  }} />

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
    }, [activeMovement, mode, sessionBusy, setMode]),
  )

  return (
    <>
      {showOverview ? (
        <WorkoutOverviewView
          user={user}
          session={session}
          draftWarning={draftWarning}
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
          focusState={focusState}
          drafts={drafts}
          draftWarning={draftWarning}
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
