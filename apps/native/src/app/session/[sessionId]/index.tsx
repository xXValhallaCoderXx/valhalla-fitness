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
import { Button, PageHeader, Panel, Screen, Text } from '@/components'
import { useSession } from '@/lib/session-provider'
import { spacing, useTokens } from '@/lib/tokens'
import { FocusComingUp } from '@/features/session/FocusComingUp'
import { FocusExerciseHeader } from '@/features/session/FocusExerciseHeader'
import { FocusSetCard, type SetDraft } from '@/features/session/FocusSetCard'
import { FocusSetProgressBar } from '@/features/session/FocusSetProgressBar'
import { FocusTopBar } from '@/features/session/FocusTopBar'
import { sessionQueryOptions } from '@/features/session/queries'

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

  return <FocusView session={session.data} />
}

function FocusView({ session }: { session: WorkoutSession }) {
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
    if (result.kind === 'sessionComplete') return
    if (result.movementId !== activeMovement.id) setActiveMovementId(result.movementId)
    setSelectedSetIndex(result.setIndex)
  }

  // L3 wires the optimistic set-log mutation; render-only for now.
  const logSet = (_draft: SetDraft) => {
    void _draft
    void handleLogged
  }

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
            isSaving={false}
            saveFailed={selectedSet.syncState === 'syncFailed'}
            onLogSet={logSet}
            onRirSelected={carryRirToNextSet}
          />
        ) : null}

        <FocusComingUp movements={coming} onJumpTo={setActiveMovementId} />
      </ScrollView>
    </View>
  )
}
