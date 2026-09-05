import { Button, Code, Modal, TextInput } from '@mantine/core'
import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { Caption, Heading, Text } from '~/components'
import {
  ACCOUNT_DELETE_CONFIRMATION,
  isAccountDeleteConfirmed,
} from '~/domains/account/lib/data-rights'

export function DeleteAccountDialog({
  opened,
  isPending,
  onClose,
  onConfirm,
}: {
  opened: boolean
  isPending: boolean
  onClose: () => void
  onConfirm: (confirmation: string) => void
}) {
  const [confirmation, setConfirmation] = useState('')
  const isConfirmed = isAccountDeleteConfirmed(confirmation)

  const close = () => {
    setConfirmation('')
    onClose()
  }

  return (
    <Modal
      opened={opened}
      onClose={close}
      title={
        <div className="flex items-center gap-2">
          <AlertTriangle color="var(--vf-danger-text)" size={20} />
          <Heading order={2} size="lg">Delete account</Heading>
        </div>
      }
      closeOnClickOutside={!isPending}
      closeOnEscape={!isPending}
      withCloseButton={!isPending}
    >
      <Text component="p" size="sm" tone="dimmed" lh={1.55}>
        This permanently removes your login, profile, custom programs, workout history, set logs,
        progression decisions, bodyweight entries, and feedback. This cannot be undone.
      </Text>
      <Caption component="p" mt="md" lh={1.5}>
        Export your data first if you want to keep a copy. To continue, enter{' '}
        <Code>{ACCOUNT_DELETE_CONFIRMATION}</Code> exactly.
      </Caption>
      <TextInput
        mt="sm"
        label="Confirmation phrase"
        aria-label="Account deletion confirmation phrase"
        autoComplete="off"
        value={confirmation}
        disabled={isPending}
        onChange={(event) => setConfirmation(event.currentTarget.value)}
      />
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="default" disabled={isPending} onClick={close}>
          Keep account
        </Button>
        <Button
          color="danger"
          disabled={!isConfirmed || isPending}
          onClick={() => onConfirm(confirmation)}
        >
          {isPending ? 'Deleting…' : 'Delete account permanently'}
        </Button>
      </div>
    </Modal>
  )
}
