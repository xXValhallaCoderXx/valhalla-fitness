import { Button, Modal, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AD_HOC_TITLE_MAX_LENGTH } from '~/domains/session/lib/ad-hoc'
import { renameSessionFn } from '~/domains/session/server/session-functions'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import type { WorkoutSession } from '~/shared/types'
import { insetFieldStyles } from './form-styles'

export function RenameSessionModal({
  open,
  session,
  onClose,
}: {
  open: boolean
  session: WorkoutSession
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(session.title)
  const mutation = useMutation({
    mutationKey: ['renameSession', session.sessionId],
    mutationFn: (nextTitle: string) =>
      renameSessionFn({ data: { sessionId: session.sessionId, title: nextTitle } }),
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not rename workout',
        message: getApiErrorMessage(error, 'Unable to rename this workout.'),
      })
    },
    onSuccess: async (nextSession) => {
      queryClient.setQueryData(['session', session.sessionId], nextSession)
      await queryClient.invalidateQueries({ queryKey: ['today'] })
      onClose()
    },
  })
  const trimmed = title.trim()

  return (
    <Modal
      opened={open}
      onClose={() => {
        if (!mutation.isPending) onClose()
      }}
      title="Name this workout"
      size="sm"
      styles={{
        content: {
          border: '1px solid var(--mantine-color-default-border)',
          backgroundColor: 'var(--mantine-color-default)',
          color: 'var(--mantine-color-text)',
        },
        header: {
          backgroundColor: 'var(--mantine-color-default)',
          color: 'var(--mantine-color-text)',
        },
        title: {
          color: 'var(--mantine-color-text)',
          fontWeight: 700,
        },
        close: { color: 'var(--mantine-color-dimmed)' },
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (trimmed && !mutation.isPending) mutation.mutate(trimmed)
        }}
        className="space-y-3"
      >
        <TextInput
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={AD_HOC_TITLE_MAX_LENGTH}
          placeholder="e.g. Push day"
          data-autofocus
          styles={insetFieldStyles}
        />
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="default" disabled={mutation.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!trimmed || mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save name'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
