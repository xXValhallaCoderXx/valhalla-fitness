import { Modal } from '@mantine/core'
import type { ProgramTemplateSummary } from '~/domains/program'
import { CustomProgramBuilder } from './CustomProgramBuilder'

export function TemplateCatalogueBuilderModal({
  opened,
  titleId,
  onClose,
  onCreated,
}: {
  opened: boolean
  titleId: string
  onClose: () => void
  onCreated: (template: ProgramTemplateSummary) => Promise<void>
}) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false}
      size="64rem"
      padding={0}
      // Keep the native scrollbar (don't hide it / pad the body) so opening or closing the modal
      // doesn't reflow the centered page behind it — fixes the few-pixel horizontal layout shift.
      removeScrollProps={{ removeScrollBar: false }}
      classNames={{
        // Bottom sheet on mobile (matches the app's other modals): pinned to the bottom, rounded
        // top, flush bottom. Centered card on desktop. items-end (not stretch) keeps the sheet
        // anchored to the bottom so a keyboard overlay can't re-center it.
        inner: '!items-end !p-0 sm:!items-center sm:!p-4',
        content: '!mb-0 max-h-[92dvh] w-full rounded-t-2xl rounded-b-none sm:max-h-[92dvh] sm:rounded-lg',
        body: 'h-full',
      }}
      styles={{
        content: {
          backgroundColor: 'transparent',
          border: 0,
          boxShadow: 'none',
        },
        body: {
          padding: 0,
        },
      }}
    >
      <CustomProgramBuilder titleId={titleId} onClose={onClose} onCreated={onCreated} />
    </Modal>
  )
}
