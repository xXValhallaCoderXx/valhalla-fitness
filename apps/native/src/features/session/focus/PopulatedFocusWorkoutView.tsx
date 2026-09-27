import { useRef, useState } from 'react'
import { ScrollView } from 'react-native'
import type { User } from '@supabase/supabase-js'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import { exerciseNeighbors } from '@sheetless/domain/session/live-focus-utils'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { Button, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { useMe } from '@/lib/account'
import { FocusExerciseHeader } from './FocusExerciseHeader'
import { FocusSetCard } from './FocusSetCard'
import { FocusRestCard } from './FocusRestCard'
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
import { WorkoutSetTable } from '../overview/WorkoutSetTable'
import { RestTimerPill } from '../rest-timer/RestTimerPill'
import { useRestTimerState } from '../rest-timer/rest-timer-context'
import { focusRestTarget } from '../rest-timer/focus-rest'

export function PopulatedFocusWorkoutView({ user, session, activeMovementId, notes, sessionBusy,
  overview, onNotesChange, onSelectMovement, onShowFocus }: {
  user: User; session: WorkoutSession; activeMovementId: string; notes: string; sessionBusy: boolean; overview: boolean
  onNotesChange: (notes: string) => void; onSelectMovement: (movementId: string | null) => void; onShowFocus: () => void
}) {
  const movement = (session.movements.find(item => item.id === activeMovementId) ?? session.movements[0])!
  const scroll = useRef<ScrollView>(null)
  const selectMovement = (id: string | null) => { onSelectMovement(id); scroll.current?.scrollTo({ y: 0, animated: true }) }
  const logger = useWorkoutLogger(user, session, movement, selectMovement, sessionBusy)
  const advanced = useMe().data?.experienceMode === 'full'
  const rest = useRestTimerState()
  const restTarget = !overview ? focusRestTarget(session, rest, movement.id, logger.selectedSetIndex) : null
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const addSet = useAddExerciseSet(user, session, movement)
  const order = useAccessoryOrderMutation(user, session)
  const addedIndex = order.orderedSlotIds.indexOf(movement.slotId ?? movement.id)
  const typedLoad = logger.input.load.trim() ? Number(logger.input.load.replace(',', '.')) : NaN
  const management = useWorkoutManagement({ user, session, movement, selectedSet: logger.set, initialPlateLoad: Number.isFinite(typedLoad) ? typedLoad : null, notes,
    disabled: sessionBusy, onNotesChange, onSelectMovement: logger.selectMovement })
  const { hasPrev, hasNext, prevId, nextId } = exerciseNeighbors(session, movement.id)
  const otherMovements = order.displayMovements.filter(item => item.id !== movement.id)
  const receipt = <LoggedSetReceipt user={user} session={session} disabled={sessionBusy}
    onSelect={logger.selectMovementSet} />

  return <>
    <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, gap: spacing.sm, padding: spacing.lg, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled">
      <ReturnSessionNotice session={session} />
      {!overview ? <FocusExerciseHeader movement={movement} ordinal={order.displayMovements.findIndex(item => item.id === movement.id) + 1} total={session.movements.length} hasPrev={hasPrev} hasNext={hasNext}
        onPrev={() => prevId && logger.selectMovement(prevId)} onNext={() => nextId && logger.selectMovement(nextId)} /> : null}
      {overview ? <WorkoutSetTable session={session} movement={movement} logger={logger} advanced={advanced}
        ordinal={order.displayMovements.findIndex(item => item.id === movement.id) + 1}
        onFocus={onShowFocus} onAdjust={() => setAdjustOpen(true)} onTools={() => setToolsOpen(true)} />
        : restTarget ? <FocusRestCard session={session} movement={movement} setIndex={logger.selectedSetIndex}
          input={logger.input} complete={restTarget.kind === 'sessionComplete'} receipt={receipt} />
          : <FocusSetCard session={session} movement={movement} logger={logger}
            onAdjust={() => setAdjustOpen(true)} onTools={() => setToolsOpen(true)} />}
      {logger.error && !logger.failed ? <Text tone="danger" size="sm">{getApiErrorMessage(logger.error, 'Unable to save this set.')}</Text> : null}
      {!restTarget ? receipt : null}
      {overview ? <>
        <Panel style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 4, borderRadius: 20,
          boxShadow: 'none', elevation: 0 }}>
          <SectionLabel>{otherMovements.length ? `Other exercises · ${otherMovements.length}` : 'All exercises shown above'}</SectionLabel>
          {otherMovements.map((item, index) => <WorkoutOverviewRow key={item.id}
            movement={item} session={session} advanced={advanced} ordinal={order.displayMovements.indexOf(item) + 1} active={false} last={index === otherMovements.length - 1}
            onOpen={() => logger.selectMovement(item.id)} />)}
        </Panel>
        <Button label={session.isAdHoc ? 'Add exercise' : 'Add accessory'} variant="default" fullWidth
          style={{ borderStyle: 'dashed', backgroundColor: 'transparent' }} disabled={sessionBusy} onPress={management.workoutTools.onAddMovement} />
      </> : null}
      {order.errorMessage ? <Text tone="danger">{order.errorMessage}</Text> : null}
    </ScrollView>
    {!restTarget ? <RestTimerPill /> : null}
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
