/**
 * Live session route — the Focus logger (native port of web LiveFocusView +
 * the state slice of SessionPage). One exercise, one set, big controls.
 * Mutation wiring lands in L3; this commit is the full render layer.
 */
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import { sessionCompletion } from '@sheetless/domain/session/session-cache'
import {
  advanceAfterLog,
  exerciseNeighbors,
  firstActionableSetIndex,
  upcomingMovements,
} from '@sheetless/domain/session/live-focus-utils'
import type { User } from '@supabase/supabase-js'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { Button, PageHeader, Panel, Screen, Text } from '@/components'
import { useSession } from '@/lib/session-provider'
import { spacing, useTokens } from '@/lib/tokens'
import { FocusComingUp } from '@/features/session/FocusComingUp'
import { FocusExerciseHeader } from '@/features/session/FocusExerciseHeader'
import { FocusSetCard, type SetDraft } from '@/features/session/FocusSetCard'
import { FocusSetProgressBar } from '@/features/session/FocusSetProgressBar'
import { FocusTopBar } from '@/features/session/FocusTopBar'
import { sessionQueryOptions } from '@/features/session/queries'
import { useAddExerciseSet } from '@/features/session/useAddExerciseSet'
import { useSetLogMutation } from '@/features/session/useSetLogMutation'

export default function LiveSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>()
  const { user } = useSession()

  const session = useQuery({
    ...sessionQueryOptions(user!, sessionId),
    enabled: Boolean(user && sessionId),
  })

  if (session.isPending) {
    return (
      <Screen>
        <PageHeader title="Workout" />
        <Panel style={{ padding: spacing.md }}>
          <Text tone="dimmed">Loading your workout…</Text>
        </Panel>
      </Screen>
    )
  }

  if (session.isError || !session.data) {
    return (
      <Screen>
        <PageHeader title="Workout" />
        <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
          <Text tone="danger" size="sm">
            {session.error instanceof Error ? session.error.message : 'This workout could not load.'}
          </Text>
          <Button label="Back to Today" variant="default" onPress={() => router.replace('/(tabs)')} />
        </Panel>
      </Screen>
    )
  }

  return <FocusView user={user!} session={session.data} />
}

function FocusView({ user, session }: { user: User; session: WorkoutSession }) {
  const { theme } = useTokens()
  const insets = useSafeAreaInsets()

  const defaultMovementId = useMemo(() => {
    const ordered = [...session.movements].sort((a, b) => a.orderIndex - b.orderIndex)
    return (
      ordered.find((movement) => movement.sets.some((set) => !set.completed))?.id ?? ordered[0]?.id ?? null
    )
    // Default once per mount — navigation state must not jump when the session refetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [activeMovementId, setActiveMovementId] = useState(defaultMovementId)
  const activeMovement =
    session.movements.find((movement) => movement.id === activeMovementId) ?? session.movements[0]
  const [selectedSetIndex, setSelectedSetIndex] = useState(() =>
    activeMovement ? firstActionableSetIndex(activeMovement) : 1,
  )
  const [suggestedRirBySetIndex, setSuggestedRirBySetIndex] = useState<Record<number, number | undefined>>({})

  // Jump to the first actionable set whenever the active exercise changes.
  useEffect(() => {
    if (activeMovement) setSelectedSetIndex(firstActionableSetIndex(activeMovement))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMovementId])

  const selectedSetForHooks =
    activeMovement?.sets.find((set) => set.setIndex === selectedSetIndex) ?? activeMovement?.sets[0]
  const setLog = useSetLogMutation(
    user,
    session,
    activeMovement ?? session.movements[0] ?? ({} as never),
    selectedSetForHooks?.setIndex ?? 1,
  )
  const addSet = useAddExerciseSet(
    user,
    session,
    activeMovement ?? session.movements[0] ?? ({} as never),
  )

  if (!activeMovement) {
    return (
      <Screen>
        <PageHeader title={session.title} />
        <Panel style={{ padding: spacing.md }}>
          <Text tone="dimmed">This session has no movements yet.</Text>
        </Panel>
        <Button label="Back to Today" variant="default" onPress={() => router.replace('/(tabs)')} />
      </Screen>
    )
  }

  const selectedSet =
    activeMovement.sets.find((set) => set.setIndex === selectedSetIndex) ?? activeMovement.sets[0]
  const setTotal = activeMovement.sets.length
  const setNumber = selectedSet
    ? activeMovement.sets.findIndex((set) => set.setIndex === selectedSet.setIndex) + 1
    : 1
  const { hasPrev, hasNext, prevId, nextId } = exerciseNeighbors(session, activeMovement.id)
  const overall = sessionCompletion(session)
  const coming = upcomingMovements(session, activeMovement.id, 2)

  const carryRirToNextSet = (setIndex: number, value: number) => {
    const nextSet = activeMovement.sets.find((set) => set.setIndex > setIndex && !set.completed)
    if (!nextSet || typeof nextSet.actualRir === 'number') return
    setSuggestedRirBySetIndex((current) => ({ ...current, [nextSet.setIndex]: value }))
  }

  const handleLogged = (nextSession: WorkoutSession, loggedSetIndex: number) => {
    const result = advanceAfterLog(nextSession, activeMovement.id, loggedSetIndex)
    // sessionComplete needs no navigation — the all-done banner appears and the
    // user finishes with an explicit tap (deliberately not web's auto-open modal).
    if (result.kind === 'sessionComplete') return
    if (result.movementId !== activeMovement.id) setActiveMovementId(result.movementId)
    setSelectedSetIndex(result.setIndex)
  }

  const saveFailed = selectedSet?.syncState === 'syncFailed'
  const isSaving = setLog.isPending || selectedSet?.syncState === 'saving'

  const logSet = (draft: SetDraft) => {
    if (!selectedSet || isSaving) return
    // A retry of a failed save reuses the set's clientMutationId so the RPC dedupes it.
    const completed = saveFailed ? selectedSet.completed : true
    setLog.mutate(
      {
        movementSlotId: activeMovement.id,
        setIndex: selectedSet.setIndex,
        actualLoad: draft.actualLoad,
        actualReps: draft.actualReps,
        actualRir: draft.actualRir,
        completed,
        clientMutationId: saveFailed
          ? selectedSet.clientMutationId ?? crypto.randomUUID()
          : crypto.randomUUID(),
      },
      { onSuccess: (nextSession) => handleLogged(nextSession, selectedSet.setIndex) },
    )
  }

  const allComplete =
    session.movements.length > 0 &&
    session.movements.every((movement) => movement.sets.every((set) => set.completed))

  return (
    <View style={{ backgroundColor: theme.background, flex: 1, paddingTop: insets.top }}>
      <FocusTopBar
        onBack={() => router.replace('/(tabs)')}
        centerPrimary={activeMovement.movementName}
        centerSecondary={`${session.title} · Set ${setNumber} of ${setTotal}`}
        equipmentMode={session.equipmentMode}
        finishLabel="Finish"
        finishDisabled
        onFinish={() => {}}
        discardDisabled
        onDiscard={() => {}}
      />

      <View style={{ backgroundColor: theme.surface2, height: 4 }}>
        <View
          style={{
            backgroundColor: theme.primaryFill,
            height: 4,
            width: `${overall.percent}%`,
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
        {allComplete ? (
          <Panel
            style={{
              backgroundColor: theme.tones.success.soft,
              borderColor: theme.tones.success.border,
              gap: 2,
              padding: spacing.md,
            }}
          >
            <Text weight={800} style={{ color: theme.tones.success.text }}>
              All sets logged — great work.
            </Text>
            <Text size="sm" tone="dimmed">
              Finish when you're ready to wrap up and review the session.
            </Text>
          </Panel>
        ) : null}

        <FocusExerciseHeader
          movement={activeMovement}
          units={session.units}
          hasPrev={hasPrev}
          hasNext={hasNext}
          onPrev={() => prevId && setActiveMovementId(prevId)}
          onNext={() => nextId && setActiveMovementId(nextId)}
        />

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

        {activeMovement.role === 'accessory' ? (
          <Button
            label="Add set"
            variant="default"
            fullWidth
            loading={addSet.isPending}
            onPress={() =>
              addSet.mutate(undefined, {
                onSuccess: (nextSession) => {
                  const nextMovement = nextSession.movements.find(
                    (movement) => movement.id === activeMovement.id,
                  )
                  const newSetIndex = nextMovement?.sets.at(-1)?.setIndex
                  if (newSetIndex) setSelectedSetIndex(newSetIndex)
                },
              })
            }
          />
        ) : null}
        {addSet.isError ? (
          <Text size="sm" tone="danger">
            {getApiErrorMessage(addSet.error, 'Unable to add another set.')}
          </Text>
        ) : null}

        <FocusComingUp movements={coming} onJumpTo={setActiveMovementId} />
      </ScrollView>
    </View>
  )
}
