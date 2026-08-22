import { Button, Modal, Textarea } from '@mantine/core'
import { useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { Caption } from '~/components'
import {
  FEEDBACK_MESSAGE_MAX,
  menuCategoryOptions,
  type FeedbackCategory,
} from '~/domains/feedback/lib/feedback-options'
import { useSubmitFeedback } from '~/domains/feedback/useSubmitFeedback'
import { FeedbackChipGroup } from './FeedbackChips'
import { feedbackFieldStyles } from './field-styles'

/** Global "Beta feedback" form, opened from the account menu. */
export function BetaFeedbackModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const route = useRouterState({ select: (state) => state.location.pathname })
  const [category, setCategory] = useState<FeedbackCategory | null>(null)
  const [message, setMessage] = useState('')
  const mutation = useSubmitFeedback({
    onSubmitted: () => {
      setCategory(null)
      setMessage('')
      onClose()
    },
  })
  const canSubmit = category !== null && message.trim().length > 0 && !mutation.isPending

  return (
    <Modal
      opened={opened}
      onClose={() => {
        if (!mutation.isPending) onClose()
      }}
      title="Beta feedback"
      closeOnClickOutside={!mutation.isPending}
      closeOnEscape={!mutation.isPending}
      withCloseButton={!mutation.isPending}
    >
      <div className="space-y-3">
        <Caption component="p" lh={1.4}>
          Tell us what's broken, confusing, or missing — it goes straight to the developer.
        </Caption>
        <FeedbackChipGroup
          label="Feedback type"
          options={menuCategoryOptions}
          value={category}
          onChange={setCategory}
          disabled={mutation.isPending}
        />
        <Textarea
          label="What happened?"
          placeholder="The more specific, the better."
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          autosize
          minRows={4}
          maxLength={FEEDBACK_MESSAGE_MAX}
          disabled={mutation.isPending}
          styles={feedbackFieldStyles}
          data-testid="beta-feedback-message"
        />
        <div className="flex flex-col-reverse gap-2.5 pt-1 sm:flex-row sm:justify-end">
          <Button variant="default" disabled={mutation.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit}
            loading={mutation.isPending}
            onClick={() => {
              if (category !== null) mutation.mutate({ source: 'menu', category, message, route })
            }}
            data-testid="send-beta-feedback"
          >
            Send feedback
          </Button>
        </div>
      </div>
    </Modal>
  )
}
