import { ConfirmDialog } from '~/components'
import type { WorkoutSession } from '~/shared/types'
import { useDiscardWorkout } from './useDiscardWorkout'

export function DiscardWorkoutDialog({
  open,
  session,
  onClose,
}: {
  open: boolean
  session: WorkoutSession
  onClose: () => void
}) {
  const discardMutation = useDiscardWorkout(session.sessionId, onClose)

  return (
    <ConfirmDialog
      open={open}
      title="Discard workout?"
      confirmLabel="Discard workout"
      cancelLabel="Keep workout"
      confirmVariant="danger"
      tone="danger"
      isPending={discardMutation.isPending}
      onConfirm={() => discardMutation.mutate()}
      onCancel={onClose}
    >
      {session.isAdHoc
        ? 'This permanently deletes the workout and all of its logs. It will not appear in your history.'
        : 'This permanently deletes this attempt, including its logs, notes, exercise changes, and future phase edits made during the workout. The same planned workout will remain next.'}
    </ConfirmDialog>
  )
}
