import { ReturnSessionNotice } from '../live/ReturnSessionNotice'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { User } from '@supabase/supabase-js'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import { sessionCompletion } from '@sheetless/domain/session/session-cache'
import {
  advanceAfterLog,
  exerciseNeighbors,
  upcomingMovements,
} from '@sheetless/domain/session/live-focus-utils'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import { FocusComingUp } from './FocusComingUp'
import { FocusLoggedSets } from './FocusLoggedSets'
import { FocusExerciseHeader } from './FocusExerciseHeader'
import { FocusMovementTools } from './FocusMovementTools'
import { FocusSetCard, type SetDraft } from './FocusSetCard'
import { FocusSetProgressBar } from './FocusSetProgressBar'
import { FocusTopBar } from '../live/FocusTopBar'
import { AddSetAction, WorkoutCompleteBanner } from '../live/FocusWorkoutActions'
import { useAddExerciseSet } from './useAddExerciseSet'
import { useSetLogMutation } from './useSetLogMutation'
import type { useFocusSetState } from './useFocusSetState'
import type { useWorkoutDrafts } from './useWorkoutDrafts'
import { useRestTimerState } from '../rest-timer/rest-timer-context'
import { WorkoutManagementSheets } from '../editing/WorkoutManagementSheets'
import { WorkoutToolsPanel } from '../editing/WorkoutToolsPanel'
import { useWorkoutManagement } from '../editing/useWorkoutManagement'

export function PopulatedFocusWorkoutView({
  user,
  session,
  activeMovementId,
  focusState,
  drafts,
  draftWarning,
  notes,
  sessionBusy,
  finishBlocked,
  onNotesChange,
  onSelectMovement,
  onShowOverview,
  onRename,
  onFinish,
  onDiscard,
}: {
  user: User
  session: WorkoutSession
  activeMovementId: string
  focusState: ReturnType<typeof useFocusSetState>
  drafts: ReturnType<typeof useWorkoutDrafts>
  draftWarning: React.ReactNode
  notes: string
  sessionBusy: boolean
  finishBlocked: boolean
  onNotesChange: (notes: string) => void
  onSelectMovement: (movementId: string | null) => void
  onShowOverview: () => void
  onRename: () => void
  onFinish: () => void
  onDiscard: () => void
}) {
  const { theme } = useTokens()
  const insets = useSafeAreaInsets()
  const rest = useRestTimerState()
  const activeMovement = (
    session.movements.find((movement) => movement.id === activeMovementId) ?? session.movements[0]
  )!
  const { selectedSetIndex, selectSet, carryRirToNextSet, suggestedRir } =
    focusState

  const selectedSet = activeMovement.sets.find((set) => set.setIndex === selectedSetIndex)
    ?? activeMovement.sets[0]
  const setLog = useSetLogMutation(user, session, activeMovement, selectedSet?.setIndex ?? 1)
  const addSet = useAddExerciseSet(user, session, activeMovement)
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
    onSelectMovement,
  })

  const handleLogged = (nextSession: WorkoutSession, loggedSetIndex: number) => {
    const result = advanceAfterLog(nextSession, activeMovement.id, loggedSetIndex)
    if (result.kind === 'sessionComplete') return
    if (result.movementId !== activeMovement.id) onSelectMovement(result.movementId)
    else selectSet(result.setIndex)
  }
  const saveFailed = selectedSet?.syncState === 'syncFailed'
  const isSaving = setLog.isPending || selectedSet?.syncState === 'saving'
  const logSet = (draft: SetDraft) => {
    if (!selectedSet || isSaving || sessionBusy) return
    selectSet(selectedSet.setIndex)
    setLog.mutate(
      {
        movementSlotId: activeMovement.id,
        setIndex: selectedSet.setIndex,
        actualLoad: draft.actualLoad,
        actualReps: draft.actualReps,
        actualRir: draft.actualRir,
        completed: draft.completed,
        clientMutationId: crypto.randomUUID(),
      },
      { onSuccess: (nextSession) => {
        drafts.clear(activeMovement, selectedSet.setIndex)
        if (draft.completed && !selectedSet.completed) handleLogged(nextSession, selectedSet.setIndex)
      } },
    )
  }
  const allComplete = session.movements.every((movement) =>
    movement.sets.every((set) => set.completed),
  )
  const addSetError = addSet.isError
    ? getApiErrorMessage(addSet.error, 'Unable to add another set.')
    : null

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ backgroundColor: theme.background, flex: 1, paddingTop: insets.top }}>
      <FocusTopBar
        onBack={onShowOverview}
        backDisabled={sessionBusy}
        backLabel="Overview"
        centerPrimary={session.title}
        centerSecondary={`${sessionCompletion(session).completed} of ${sessionCompletion(session).total} sets logged`}
        equipmentMode={session.equipmentMode}
        finishLabel="Finish"
        finishDisabled={finishBlocked}
        onFinish={onFinish}
        renameDisabled={sessionBusy}
        onRename={session.isAdHoc && session.status === 'in_progress' ? onRename : undefined}
        discardDisabled={sessionBusy}
        onDiscard={onDiscard}
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
          paddingBottom: spacing.md + insets.bottom + (rest.active ? 108 : 0),
        }}
        keyboardShouldPersistTaps="handled"
      >
        <ReturnSessionNotice session={session} />
        <WorkoutCompleteBanner visible={allComplete} disabled={finishBlocked} onFinish={onFinish} />
        <FocusExerciseHeader
          movement={activeMovement}
          units={session.units}
          hasPrev={hasPrev}
          hasNext={hasNext}
          onPrev={() => prevId && onSelectMovement(prevId)}
          onNext={() => nextId && onSelectMovement(nextId)}
        />
        <FocusSetProgressBar
          movement={activeMovement}
          selectedSetIndex={selectedSetIndex}
          onSelectSet={selectSet}
        />

        {selectedSet ? (
          <FocusSetCard
            key={`${session.sessionId}-${activeMovement.id}-${activeMovement.performedMovementId ?? activeMovement.movementId}-${selectedSet.setIndex}`}
            session={session}
            movement={activeMovement}
            set={selectedSet}
            setNumber={setNumber}
            setTotal={setTotal}
            suggestedRir={suggestedRir}
            initialDraft={drafts.get(activeMovement, selectedSet.setIndex)}
            onDraftChange={(draft) => drafts.set(activeMovement, selectedSet.setIndex, draft)}
            onResetDraft={() => drafts.clear(activeMovement, selectedSet.setIndex)}
            isSaving={Boolean(isSaving)}
            disabled={sessionBusy}
            saveFailed={saveFailed}
            onLogSet={logSet}
            onRirSelected={carryRirToNextSet}
          />
        ) : null}
        {draftWarning}
        <FocusMovementTools {...management.movementTools} />
        <FocusLoggedSets movement={activeMovement} units={session.units} onSelect={selectSet} />
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
          onAdd={() => addSet.mutate(undefined, {
            onSuccess: (nextSession) => {
              const nextMovement = nextSession.movements.find(
                (movement) => movement.id === activeMovement.id,
              )
              const newSetIndex = nextMovement?.sets.at(-1)?.setIndex
              if (newSetIndex) selectSet(newSetIndex)
            },
          })}
        />
        <FocusComingUp movements={coming} units={session.units} onJumpTo={onSelectMovement} />
        <WorkoutToolsPanel {...management.workoutTools} />
      </ScrollView>
      <WorkoutManagementSheets controller={management} />
    </KeyboardAvoidingView>
  )
}
