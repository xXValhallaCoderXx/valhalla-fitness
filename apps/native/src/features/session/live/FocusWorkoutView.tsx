import { useCallback, useEffect, useState } from 'react'
import { BackHandler, Keyboard, ScrollView, View } from 'react-native'
import { useIsMutating, useQueryClient } from '@tanstack/react-query'
import { router, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { User } from '@supabase/supabase-js'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import { hasUnsettledSessionSets } from '@sheetless/domain/session/session-cache'
import { confirmedSetCount } from '@sheetless/domain/session/set-draft'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { Button, SheetModal } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import { PopulatedFocusWorkoutView } from '../focus/PopulatedFocusWorkoutView'
import { RenameWorkoutSheet } from '../editing/RenameWorkoutSheet'
import { SessionNotesSheet } from '../editing/SessionNotesSheet'
import { reconcileWorkoutDrafts, useWorkoutDrafts } from '../editing/workout-drafts'
import { useDiscardWorkout } from '../lifecycle/useDiscardWorkout'
import { useFinishSession } from '../lifecycle/useFinishSession'
import { WorkoutLifecycleSheets } from '../lifecycle/WorkoutLifecycleSheets'
import { EmptyWorkoutOverview } from '../overview/EmptyWorkoutOverview'
import { useRestTimerControls, useRestTimerState } from '../rest-timer/rest-timer-context'
import { FocusTopBar } from './FocusTopBar'
import { WorkoutProgress } from './WorkoutProgress'

export function FocusWorkoutView({ user, session }: { user: User; session: WorkoutSession }) {
  const { theme } = useTokens()
  const insets = useSafeAreaInsets()
  const client = useQueryClient()
  const rest = useRestTimerControls()
  const { active: resting } = useRestTimerState()
  const drafts = useWorkoutDrafts(user.id, session.sessionId)
  const ordered = [...session.movements].sort((a, b) => a.orderIndex - b.orderIndex)
  const [overview, setOverview] = useState(!session.movements.length)
  const [activeId, setActiveId] = useState<string | null>(() => ordered.find(m => m.sets.some(s => !s.completed))?.id ?? ordered[0]?.id ?? null)
  const movement = ordered.find(item => item.id === activeId) ?? ordered[0]
  const [notes, setNotes] = useState(session.notes ?? '')
  const [discardOpen, setDiscardOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const mutations = useIsMutating({ predicate: m => m.options.scope?.id === `session:${session.sessionId}` })
  const busy = mutations > 0
  const finishBlocked = busy || hasUnsettledSessionSets(session)
  const completedCount = confirmedSetCount(session)
  const total = session.movements.reduce((sum, m) => sum + m.sets.length, 0)
  const discard = useDiscardWorkout(user, session.sessionId, () => setDiscardOpen(false))
  const finish = useFinishSession(user, session, notes)
  const showOverview = overview || !movement
  useEffect(() => {
    reconcileWorkoutDrafts(client, user.id, session)
    rest.confirmSession(session)
  }, [client, user.id, session, rest])
  const back = useCallback(() => {
    if (Keyboard.isVisible()) { Keyboard.dismiss(); return }
    if (busy) return
    if (!showOverview) setOverview(true)
    else { rest.exit(); router.dismissTo('/(tabs)') }
  }, [busy, showOverview, rest])
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true })
    return () => subscription.remove()
  }, [back]))
  return <View style={{ flex: 1, backgroundColor: theme.background, paddingBottom: resting ? 0 : insets.bottom }}>
    <View style={{ height: insets.top, backgroundColor: theme.backgroundElevated }} />
    <FocusTopBar title={session.title} subtitle={session.isAdHoc ? 'Not part of your plan' : session.weekLabel || session.programTitle}
      overview={showOverview} busy={busy} finishBlocked={finishBlocked} onBack={back} onMenu={() => setMenuOpen(true)}
      onFinish={() => { if (!finishBlocked) setFinishOpen(true) }} />
    {showOverview && movement ? <WorkoutProgress session={session} /> : null}
    {movement ? <PopulatedFocusWorkoutView user={user} session={session} activeMovementId={movement.id} notes={notes}
      sessionBusy={busy} overview={showOverview} onNotesChange={setNotes} onSelectMovement={setActiveId} onShowFocus={() => setOverview(false)} />
      : <ScrollView contentContainerStyle={{ gap: spacing.md, padding: spacing.md }}><EmptyWorkoutOverview user={user} session={session}
        disabled={busy} onAdded={setActiveId} /></ScrollView>}
    <SheetModal open={menuOpen} title="Workout menu" onClose={() => setMenuOpen(false)}>
      <Button label={showOverview ? 'Focus' : 'Overview'} variant="default" fullWidth disabled={!movement}
        onPress={() => { setOverview(!showOverview); setMenuOpen(false) }} />
      <Button label="Finish workout" fullWidth disabled={finishBlocked}
        onPress={() => { setMenuOpen(false); setFinishOpen(true) }} />
      {session.isAdHoc ? <Button label="Rename workout" variant="default" fullWidth disabled={busy}
        onPress={() => { setMenuOpen(false); setRenameOpen(true) }} /> : null}
      <Button label="Workout notes" variant="default" fullWidth disabled={busy} onPress={() => { setMenuOpen(false); setNotesOpen(true) }} />
      <Button label="Discard attempt" variant="light" tone="danger" fullWidth disabled={busy}
        onPress={() => { setMenuOpen(false); setDiscardOpen(true) }} />
    </SheetModal>
    <SessionNotesSheet open={notesOpen} notes={notes} disabled={busy} onClose={() => setNotesOpen(false)}
      onSave={value => { setNotes(value); setNotesOpen(false) }} />
    <WorkoutLifecycleSheets session={session} discardOpen={discardOpen} discardPending={discard.isPending}
      discardError={discard.isError ? getApiErrorMessage(discard.error, 'Unable to discard this workout.') : null}
      onDiscard={() => { if (!busy) discard.mutate() }} onCloseDiscard={() => setDiscardOpen(false)}
      finishOpen={finishOpen} finishPending={finish.isPending} finishError={finish.errorMessage} finishBlocked={finishBlocked}
      completedSetCount={completedCount} incompleteSetCount={total - completedCount} editedSetCount={Object.keys(drafts.sets).length}
      onFinish={finish.mutate} onCloseFinish={() => setFinishOpen(false)}
      onEmptyDiscard={() => { setFinishOpen(false); setDiscardOpen(true) }} />
    <RenameWorkoutSheet open={renameOpen && Boolean(session.isAdHoc)} user={user} session={session} onClose={() => setRenameOpen(false)} />
  </View>
}
