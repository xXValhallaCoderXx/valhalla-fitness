import { useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import type { User } from '@supabase/supabase-js'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import { exerciseNeighbors } from '@sheetless/domain/session/live-focus-utils'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { Button, Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { FocusExerciseHeader } from './FocusExerciseHeader'
import { FocusSetCard } from './FocusSetCard'
import { useAddExerciseSet } from './useAddExerciseSet'
import { LoggedSetReceipt } from './LoggedSetReceipt'
import { ReturnSessionNotice } from '../live/ReturnSessionNotice'
import { AdjustSetSheet } from '../editing/AdjustSetSheet'
import { ExerciseToolsSheet } from '../editing/ExerciseToolsSheet'
import { useWorkoutLogger } from '../editing/useWorkoutLogger'
import { WorkoutManagementSheets } from '../editing/WorkoutManagementSheets'
import { useWorkoutManagement } from '../editing/useWorkoutManagement'
import { useAccessoryOrderMutation } from '../editing/useAccessoryOrderMutation'
import { WorkoutOverviewRow } from '../overview/WorkoutOverviewRow'

export function PopulatedFocusWorkoutView({ user, session, activeMovementId, notes, sessionBusy,
  overview, onNotesChange, onSelectMovement, onShowFocus }: {
  user: User; session: WorkoutSession; activeMovementId: string; notes: string; sessionBusy: boolean; overview: boolean
  onNotesChange: (notes: string) => void; onSelectMovement: (movementId: string | null) => void; onShowFocus: () => void
}) {
  const movement = (session.movements.find(item => item.id === activeMovementId) ?? session.movements[0])!
  const scroll = useRef<ScrollView>(null)
  const selectMovement = (id: string | null) => { onSelectMovement(id); scroll.current?.scrollTo({ y: 0, animated: true }) }
  const logger = useWorkoutLogger(user, session, movement, selectMovement, sessionBusy)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const addSet = useAddExerciseSet(user, session, movement)
  const order = useAccessoryOrderMutation(user, session)
  const addedIndex = order.orderedSlotIds.indexOf(movement.slotId ?? movement.id)
  const typedLoad = logger.input.load.trim() ? Number(logger.input.load.replace(',', '.')) : NaN
  const management = useWorkoutManagement({ user, session, movement, selectedSet: logger.set, initialPlateLoad: Number.isFinite(typedLoad) ? typedLoad : null, notes,
    disabled: sessionBusy, onNotesChange, onSelectMovement: logger.selectMovement })
  const { hasPrev, hasNext, prevId, nextId } = exerciseNeighbors(session, movement.id)

  return <>
    <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, gap: spacing.sm, padding: spacing.lg, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled">
      <ReturnSessionNotice session={session} />
      {!overview ? <FocusExerciseHeader movement={movement} ordinal={order.displayMovements.findIndex(item => item.id === movement.id) + 1} total={session.movements.length} hasPrev={hasPrev} hasNext={hasNext}
        onPrev={() => prevId && logger.selectMovement(prevId)} onNext={() => nextId && logger.selectMovement(nextId)} /> : null}
      <FocusSetCard session={session} movement={movement} logger={logger} overview={overview}
        onFocus={onShowFocus} onAdjust={() => setAdjustOpen(true)} onTools={() => setToolsOpen(true)} />
      {logger.error && !logger.failed ? <Text tone="danger" size="sm">{getApiErrorMessage(logger.error, 'Unable to save this set.')}</Text> : null}
      <LoggedSetReceipt user={user} session={session} disabled={sessionBusy} onSelect={(movementId, index) => {
        // The selection hook accepts a scope so Undo can select a different exercise's set.
        logger.selectMovementSet(movementId, index)
      }} />
      {overview ? <>
        <Panel style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 4, borderRadius: 20,
          boxShadow: 'none', elevation: 0 }}>
          <SectionLabel>The rest of this session</SectionLabel>
          {order.displayMovements.map((item, index) => <WorkoutOverviewRow key={item.id}
            movement={item} ordinal={index + 1} active={item.id === movement.id} last={index === order.displayMovements.length - 1}
            onOpen={() => logger.selectMovement(item.id)} />)}
        </Panel>
        <Button label={session.isAdHoc ? 'Add exercise' : 'Add accessory'} variant="default" fullWidth
          style={{ borderStyle: 'dashed', backgroundColor: 'transparent' }} disabled={sessionBusy} onPress={management.workoutTools.onAddMovement} />
      </> : <View style={{ marginTop: 'auto', paddingTop: spacing.lg }}>
        <Caption style={{ textAlign: 'center' }}>Focus hides the rest of the session. Your sets log exactly the same.</Caption>
      </View>}
      {order.errorMessage ? <Text tone="danger">{order.errorMessage}</Text> : null}
    </ScrollView>
    <AdjustSetSheet open={adjustOpen} onClose={() => setAdjustOpen(false)} session={session} movement={movement} logger={logger} />
    <ExerciseToolsSheet open={toolsOpen} onClose={() => setToolsOpen(false)} name={movement.performedMovementName ?? movement.movementName}
      tools={management.movementTools} canAddSet={movement.role === 'accessory' || Boolean(session.isAdHoc)}
      addError={addSet.isError ? getApiErrorMessage(addSet.error, 'Unable to add a set.') : null}
      onAddSet={() => addSet.mutate(undefined, { onSuccess: next => {
        const index = next.movements.find(item => item.id === movement.id)?.sets.at(-1)?.setIndex
        if (index) logger.selectSet(index)
        setToolsOpen(false)
      } })}
      canMoveUp={Boolean(!session.isAdHoc && movement.isAdded && addedIndex > 0)}
      canMoveDown={Boolean(!session.isAdHoc && movement.isAdded && addedIndex >= 0 && addedIndex < order.orderedSlotIds.length - 1)}
      onMove={direction => order.move(movement, direction)} />
    <WorkoutManagementSheets controller={management} />
  </>
}
