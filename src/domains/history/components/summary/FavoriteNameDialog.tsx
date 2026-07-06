import { Button, Modal, TextInput } from '@mantine/core'
import { useState } from 'react'
import { Caption } from '~/components'
import { AD_HOC_TITLE_MAX_LENGTH } from '~/domains/session/lib/ad-hoc'

/** Favourites need a recognisable name — prompt for one (prefilled) before saving. */
export function FavoriteNameDialog({
  initialTitle,
  isPending,
  onCancel,
  onSave,
}: {
  initialTitle: string
  isPending: boolean
  onCancel: () => void
  onSave: (title: string) => void
}) {
  const [title, setTitle] = useState(initialTitle)
  const trimmed = title.trim()

  return (
    <Modal
      opened
      onClose={() => {
        if (!isPending) onCancel()
      }}
      title="Name this favourite"
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
          if (trimmed && !isPending) onSave(trimmed)
        }}
        className="space-y-3"
      >
        <TextInput
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={AD_HOC_TITLE_MAX_LENGTH}
          placeholder="e.g. Push day"
          data-autofocus
          styles={{
            input: {
              borderColor: 'var(--mantine-color-default-border)',
              backgroundColor: 'var(--vf-surface-2)',
            },
          }}
        />
        <Caption>The name shows with your favourites on the Plans page.</Caption>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="default" disabled={isPending} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={!trimmed} loading={isPending}>
            Save favourite
          </Button>
        </div>
      </form>
    </Modal>
  )
}
