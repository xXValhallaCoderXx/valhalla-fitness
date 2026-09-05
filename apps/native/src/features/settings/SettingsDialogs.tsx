import { ConfirmDialog } from '@/components'
import { DeleteAccountDialog } from './account/DeleteAccountDialog'

export type DestructiveIntent = 'signOut' | 'delete'

export function SettingsDialogs({
  leaveOpen,
  savePending,
  pendingIntent,
  deleteOpen,
  deletePending,
  deleteError,
  onCancelLeave,
  onConfirmLeave,
  onCancelIntent,
  onConfirmIntent,
  onCloseDelete,
  onConfirmDelete,
}: {
  leaveOpen: boolean
  savePending: boolean
  pendingIntent: DestructiveIntent | null
  deleteOpen: boolean
  deletePending: boolean
  deleteError: string | null
  onCancelLeave: () => void
  onConfirmLeave: () => void
  onCancelIntent: () => void
  onConfirmIntent: () => void
  onCloseDelete: () => void
  onConfirmDelete: (confirmation: string) => void
}) {
  return (
    <>
      <ConfirmDialog
        open={leaveOpen}
        title="Discard unsaved changes?"
        confirmLabel="Discard & leave"
        tone="danger"
        isPending={savePending}
        onCancel={onCancelLeave}
        onConfirm={onConfirmLeave}
      >
        Your profile changes have not been saved. Leaving now will discard them.
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(pendingIntent)}
        title={pendingIntent === 'signOut' ? 'Discard changes and sign out?' : 'Discard changes first?'}
        confirmLabel={pendingIntent === 'signOut' ? 'Discard & sign out' : 'Discard & continue'}
        tone="danger"
        onCancel={onCancelIntent}
        onConfirm={onConfirmIntent}
      >
        Save your profile changes first if you want to keep them.
      </ConfirmDialog>

      <DeleteAccountDialog
        open={deleteOpen}
        isPending={deletePending}
        error={deleteError}
        onClose={onCloseDelete}
        onConfirm={onConfirmDelete}
      />
    </>
  )
}
