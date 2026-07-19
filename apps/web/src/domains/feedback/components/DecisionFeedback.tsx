import { Button, Popover, Textarea } from '@mantine/core'
import { useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { Caption, SectionLabel } from '~/components'
import {
  FEEDBACK_MESSAGE_MAX,
  buildDecisionFeedbackInput,
  decisionReasonOptions,
  type FeedbackCategory,
} from '~/domains/feedback/lib/feedback-options'
import { useSubmitFeedback } from '~/domains/feedback/useSubmitFeedback'
import type { ProgressionDecision } from '~/shared/types'
import { FeedbackChipGroup } from './FeedbackChips'
import { feedbackFieldStyles } from './field-styles'

/**
 * Quiet "Something off?" affordance on a progression decision. Opens a popover
 * with reason chips + optional note; the submission snapshots the decision's
 * rule and numbers so the report can show exactly what felt wrong.
 */
export function DecisionFeedbackTrigger({
  decision,
  sessionId,
}: {
  decision: ProgressionDecision
  sessionId?: string | null
}) {
  const route = useRouterState({ select: (state) => state.location.pathname })
  const [opened, setOpened] = useState(false)
  const [category, setCategory] = useState<FeedbackCategory | null>(null)
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const mutation = useSubmitFeedback({
    onSubmitted: () => {
      setSent(true)
      setOpened(false)
    },
  })

  if (sent) {
    return (
      <Caption component="p" fw={700} tone="success" data-testid="decision-feedback-sent">
        Feedback sent
      </Caption>
    )
  }

  const send = () => {
    if (!category || mutation.isPending) return
    mutation.mutate(buildDecisionFeedbackInput(decision, { category, message, route, sessionId }))
  }

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      withArrow
      withinPortal
      position="bottom-start"
      radius="md"
      shadow="md"
      offset={6}
      width={300}
    >
      <Popover.Target>
        <Button
          variant="subtle"
          size="compact-xs"
          color="neutral"
          onClick={() => setOpened((current) => !current)}
          aria-label={`Report an issue with the ${decision.movementName} recommendation`}
        >
          Something off?
        </Button>
      </Popover.Target>
      <Popover.Dropdown p="sm">
        <SectionLabel>What looks off?</SectionLabel>
        <div className="mt-2">
          <FeedbackChipGroup
            label="What looks off?"
            options={decisionReasonOptions}
            value={category}
            onChange={setCategory}
            disabled={mutation.isPending}
          />
        </div>
        <Textarea
          label="Tell us more (optional)"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          autosize
          minRows={2}
          maxLength={FEEDBACK_MESSAGE_MAX}
          disabled={mutation.isPending}
          styles={feedbackFieldStyles}
          mt="sm"
          data-testid="decision-feedback-message"
        />
        <Button
          size="xs"
          mt="sm"
          disabled={!category}
          loading={mutation.isPending}
          onClick={send}
          data-testid="send-decision-feedback"
        >
          Send
        </Button>
      </Popover.Dropdown>
    </Popover>
  )
}
