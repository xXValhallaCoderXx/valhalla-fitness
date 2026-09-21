import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import { Button, SheetModal, Text } from '@/components'
import { FinishWorkoutSheet, type FinishReflection } from './FinishWorkoutSheet'
import { elapsedLabel } from '../live/WorkoutProgress'

export function WorkoutLifecycleSheets({ session, discardOpen, discardPending, discardError, onDiscard, onCloseDiscard,
  finishOpen, finishPending, finishError, finishBlocked, completedSetCount, incompleteSetCount, editedSetCount,
  onFinish, onCloseFinish, onEmptyDiscard }: {
  session: WorkoutSession; discardOpen: boolean; discardPending: boolean; discardError: string | null
  onDiscard: () => void; onCloseDiscard: () => void; finishOpen: boolean; finishPending: boolean
  finishError: string | null; finishBlocked: boolean; completedSetCount: number; incompleteSetCount: number; editedSetCount: number
  onFinish: (reflection: FinishReflection) => void; onCloseFinish: () => void; onEmptyDiscard: () => void
}) {
  return <>
    <SheetModal open={discardOpen} showHandle title="Discard this attempt?" subtitle={`${completedSetCount} set${completedSetCount === 1 ? '' : 's'} logged · ${elapsedLabel(session.startedAt)}`}
      onClose={onCloseDiscard} closeDisabled={discardPending} footer={
        <Button label="Discard attempt" tone="danger" fullWidth loading={discardPending} onPress={onDiscard} />
      }>
      <Text>{session.isAdHoc
        ? 'This permanently deletes the workout and all of its logs. It will not appear in your history.'
        : 'This permanently deletes this attempt, including its logs, notes, exercise changes, and future phase edits made during the workout. The same planned workout will remain next.'}</Text>
      {discardError ? <Text tone="danger">{discardError}</Text> : null}
      <Button label="Keep logging" fullWidth variant="default" disabled={discardPending} onPress={onCloseDiscard} />
    </SheetModal>
    <SheetModal open={finishOpen && completedSetCount === 0} showHandle title="No sets logged yet" onClose={onCloseFinish}>
      <Text>Log a completed set to finish this workout, or discard this attempt.</Text>
      <Button label="Keep logging" fullWidth onPress={onCloseFinish} />
      <Button label="Discard attempt" variant="light" tone="danger" fullWidth disabled={finishBlocked} onPress={onEmptyDiscard} />
    </SheetModal>
    <FinishWorkoutSheet open={finishOpen && completedSetCount > 0} completedSetCount={completedSetCount}
      incompleteSetCount={incompleteSetCount} editedSetCount={editedSetCount} elapsed={elapsedLabel(session.startedAt)}
      isPending={finishPending} blocked={finishBlocked} error={finishError} onCancel={onCloseFinish}
      onFinish={reflection => { if (!finishBlocked && completedSetCount > 0) onFinish(reflection) }} />
  </>
}
