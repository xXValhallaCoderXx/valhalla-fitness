import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import { ConfirmDialog } from '@/components'
import { FinishWorkoutSheet, type FinishReflection } from './FinishWorkoutSheet'

export function WorkoutLifecycleSheets({
  session,
  discardOpen,
  discardPending,
  discardError,
  onDiscard,
  onCloseDiscard,
  finishOpen,
  finishPending,
  finishError,
  finishBlocked,
  incompleteSetCount,
  onFinish,
  onCloseFinish,
}: {
  session: WorkoutSession
  discardOpen: boolean
  discardPending: boolean
  discardError: string | null
  onDiscard: () => void
  onCloseDiscard: () => void
  finishOpen: boolean
  finishPending: boolean
  finishError: string | null
  finishBlocked: boolean
  incompleteSetCount: number
  onFinish: (reflection: FinishReflection) => void
  onCloseFinish: () => void
}) {
  return (
    <>
      <ConfirmDialog
        open={discardOpen}
        title="Discard workout?"
        confirmLabel="Discard workout"
        cancelLabel="Keep workout"
        tone="danger"
        isPending={discardPending}
        error={discardError}
        onConfirm={onDiscard}
        onCancel={onCloseDiscard}
      >
        {session.isAdHoc
          ? 'This permanently deletes the workout and all of its logs. It will not appear in your history.'
          : 'This permanently deletes this attempt, including its logs, notes, exercise changes, and future phase edits made during the workout. The same planned workout will remain next.'}
      </ConfirmDialog>

      <FinishWorkoutSheet
        open={finishOpen}
        incompleteSetCount={incompleteSetCount}
        isPending={finishPending}
        error={finishError}
        onCancel={onCloseFinish}
        onFinish={(reflection) => {
          if (!finishBlocked) onFinish(reflection)
        }}
      />
    </>
  )
}
