import { useEffect, useMemo, useState } from 'react'
import { useIsMutating } from '@tanstack/react-query'
import { router } from 'expo-router'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { User } from '@supabase/supabase-js'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import { sessionCompletion } from '@sheetless/domain/session/session-cache'
import {
  advanceAfterLog,
  exerciseNeighbors,
  firstActionableSetIndex,
  upcomingMovements,
} from '@sheetless/domain/session/live-focus-utils'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import { FocusComingUp } from './FocusComingUp'
import { FocusExerciseHeader } from './FocusExerciseHeader'
import { FocusMovementTools } from './FocusMovementTools'
import { FocusSetCard, type SetDraft } from './FocusSetCard'
import { FocusSetProgressBar } from './FocusSetProgressBar'
import { FocusTopBar } from './FocusTopBar'
import { AddSetAction, WorkoutCompleteBanner } from './FocusWorkoutActions'
import { useAddExerciseSet } from './useAddExerciseSet'
import { useDiscardWorkout } from './useDiscardWorkout'
import { useFinishSession } from './useFinishSession'
import { useSetLogMutation } from './useSetLogMutation'
import { WorkoutLifecycleSheets } from './WorkoutLifecycleSheets'
import { WorkoutManagementSheets } from './WorkoutManagementSheets'
import { WorkoutToolsPanel } from './WorkoutToolsPanel'
import { useWorkoutManagement } from './useWorkoutManagement'

export function PopulatedFocusWorkoutView({
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
  const { theme } = useTokens()
  const insets = useSafeAreaInsets()
  const defaultMovementId = useMemo(() => {
    const ordered = [...session.movements].sort((a, b) => a.orderIndex - b.orderIndex)
    return ordered.find((movement) => movement.sets.some((set) => !set.completed))?.id ?? ordered[0]?.id ?? null
    // Default once per mount — navigation state must not jump when the session refetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [activeMovementId, setActiveMovementId] = useState<string | null>(defaultMovementId)
  const activeMovement = (
    session.movements.find((movement) => movement.id === activeMovementId) ?? session.movements[0]
  )!
  const [selectedSetIndex, setSelectedSetIndex] = useState(() => firstActionableSetIndex(activeMovement))
  const [suggestedRirBySetIndex, setSuggestedRirBySetIndex] = useState<Record<number, number | undefined>>({})
  const [discardOpen, setDiscardOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)

  useEffect(() => {
    setSelectedSetIndex(firstActionableSetIndex(activeMovement))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMovementId])

  const selectedSetForHooks =
    activeMovement.sets.find((set) => set.setIndex === selectedSetIndex) ?? activeMovement.sets[0]
  const setLog = useSetLogMutation(user, session, activeMovement, selectedSetForHooks?.setIndex ?? 1)
  const addSet = useAddExerciseSet(user, session, activeMovement)
  const discard = useDiscardWorkout(user, session.sessionId, () => setDiscardOpen(false))
  const finish = useFinishSession(user, session, notes)
  const activeSessionMutations = useIsMutating({
    predicate: (mutation) => mutation.options.scope?.id === `session:${session.sessionId}`,
  })
  const sessionBusy = activeSessionMutations > 0
  const selectedSet = selectedSetForHooks
  const setTotal = activeMovement.sets.length
  const setNumber = selectedSet
    ? activeMovement.sets.findIndex((set) => set.setIndex === selectedSet.setIndex) + 1
    : 1
  const { hasPrev, hasNext, prevId, nextId } = exerciseNeighbors(session, activeMovement.id)
  const coming = upcomingMovements(session, activeMovement.id, 2)
  const management = useWorkoutManagement({
    user,
    session,
    movement: activeMovement,
    selectedSet,
    notes,
    disabled: sessionBusy,
    onNotesChange,
    onSelectMovement: setActiveMovementId,
  })

  const carryRirToNextSet = (setIndex: number, value: number) => {
    const nextSet = activeMovement.sets.find((set) => set.setIndex > setIndex && !set.completed)
    if (!nextSet || typeof nextSet.actualRir === 'number') return
    setSuggestedRirBySetIndex((current) => ({ ...current, [nextSet.setIndex]: value }))
  }

  const handleLogged = (nextSession: WorkoutSession, loggedSetIndex: number) => {
    const result = advanceAfterLog(nextSession, activeMovement.id, loggedSetIndex)
    if (result.kind === 'sessionComplete') return
    if (result.movementId !== activeMovement.id) setActiveMovementId(result.movementId)
    setSelectedSetIndex(result.setIndex)
  }

  const saveFailed = selectedSet?.syncState === 'syncFailed'
  const isSaving = setLog.isPending || selectedSet?.syncState === 'saving'
  const logSet = (draft: SetDraft) => {
    if (!selectedSet || isSaving || sessionBusy) return
    setLog.mutate(
      {
        movementSlotId: activeMovement.id,
        setIndex: selectedSet.setIndex,
        actualLoad: draft.actualLoad,
        actualReps: draft.actualReps,
        actualRir: draft.actualRir,
        completed: saveFailed ? selectedSet.completed : true,
        clientMutationId: saveFailed
          ? selectedSet.clientMutationId ?? crypto.randomUUID()
          : crypto.randomUUID(),
      },
      { onSuccess: (nextSession) => handleLogged(nextSession, selectedSet.setIndex) },
    )
  }

  const allComplete = session.movements.every((movement) => movement.sets.every((set) => set.completed))
  const incompleteSetCount = session.movements.reduce(
    (count, movement) => count + movement.sets.filter((set) => !set.completed).length,
    0,
  )
  const hasUnsettledSet = session.movements.some((movement) =>
    movement.sets.some((set) => set.syncState === 'saving' || set.syncState === 'syncFailed'),
  )
  const finishBlocked = hasUnsettledSet || sessionBusy
  const addSetError = addSet.isError
    ? getApiErrorMessage(addSet.error, 'Unable to add another set.')
    : null

  return (
    <View style={{ backgroundColor: theme.background, flex: 1, paddingTop: insets.top }}>
      <FocusTopBar
        onBack={() => router.replace('/(tabs)')}
        backDisabled={sessionBusy}
        centerPrimary={activeMovement.movementName}
        centerSecondary={`${session.title} · Set ${setNumber} of ${setTotal}`}
        equipmentMode={session.equipmentMode}
        finishLabel="Finish"
        finishDisabled={finishBlocked}
        onFinish={() => setFinishOpen(true)}
        discardDisabled={sessionBusy}
        onDiscard={() => setDiscardOpen(true)}
      />

      <View style={{ backgroundColor: theme.surface2, height: 4 }}>
        <View
          style={{
            backgroundColor: theme.primaryFill,
            height: 4,
            width: `${sessionCompletion(session).percent}%`,
          }}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          gap: spacing.md,
          padding: spacing.md,
          paddingBottom: spacing.md + insets.bottom,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <WorkoutCompleteBanner
          visible={allComplete}
          disabled={finishBlocked}
          onFinish={() => setFinishOpen(true)}
        />
        <FocusExerciseHeader
          movement={activeMovement}
          units={session.units}
          hasPrev={hasPrev}
          hasNext={hasNext}
          onPrev={() => prevId && setActiveMovementId(prevId)}
          onNext={() => nextId && setActiveMovementId(nextId)}
        />
        <FocusMovementTools {...management.movementTools} />
        <FocusSetProgressBar
          movement={activeMovement}
          selectedSetIndex={selectedSetIndex}
          onSelectSet={setSelectedSetIndex}
        />

        {selectedSet ? (
          <FocusSetCard
            key={`${activeMovement.id}-${activeMovement.performedMovementId ?? activeMovement.movementId}-${selectedSet.setIndex}`}
            session={session}
            movement={activeMovement}
            set={selectedSet}
            setNumber={setNumber}
            setTotal={setTotal}
            suggestedRir={suggestedRirBySetIndex[selectedSet.setIndex]}
            isSaving={Boolean(isSaving)}
            disabled={sessionBusy}
            saveFailed={saveFailed}
            onLogSet={logSet}
            onRirSelected={carryRirToNextSet}
          />
        ) : null}
        {setLog.isError && !saveFailed ? (
          <Text size="sm" tone="danger">
            {getApiErrorMessage(setLog.error, 'Unable to save this set. Retry when your connection is stable.')}
          </Text>
        ) : null}
        <AddSetAction
          visible={activeMovement.role === 'accessory' || Boolean(session.isAdHoc)}
          disabled={sessionBusy}
          isPending={addSet.isPending}
          error={addSetError}
          onAdd={() =>
            addSet.mutate(undefined, {
              onSuccess: (nextSession) => {
                const nextMovement = nextSession.movements.find((movement) => movement.id === activeMovement.id)
                const newSetIndex = nextMovement?.sets.at(-1)?.setIndex
                if (newSetIndex) setSelectedSetIndex(newSetIndex)
              },
            })
          }
        />
        <FocusComingUp movements={coming} onJumpTo={setActiveMovementId} />
        <WorkoutToolsPanel {...management.workoutTools} />
      </ScrollView>

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
      <WorkoutManagementSheets controller={management} />
    </View>
  )
}
