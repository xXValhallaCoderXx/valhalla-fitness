import { ActionIcon, Button, Textarea } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useState, useSyncExternalStore } from 'react'
import { meQueryOptions } from '~/domains/account/queries'
import { dismissPostWorkoutFeedbackFn } from '~/domains/account/server/profile-functions'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import {
  FEEDBACK_MESSAGE_MAX,
  postWorkoutAnswerOptions,
  postWorkoutReasonOptions,
  sessionFeedbackStorageKey,
  type FeedbackAnswer,
  type FeedbackCategory,
} from '~/domains/feedback/lib/feedback-options'
import { useSubmitFeedback } from '~/domains/feedback/useSubmitFeedback'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { track } from '~/shared/lib/analytics'
import type { ProgressionDecision, UserProfile, WorkoutSession } from '~/shared/types'
import { FeedbackChipGroup } from './FeedbackChips'
import { feedbackFieldStyles } from './field-styles'

// localStorage never notifies within a tab; same-tab changes re-render through
// component state, so the store only needs the initial (hydration-safe) read.
const noopSubscribe = () => () => {}

/**
 * Post-workout beta check-in on the fresh session summary: one-tap clarity
 * answer, reason chips on "No"/"Not sure". Hidden once answered or dismissed
 * for this session (localStorage) or opted out globally (profile flag).
 */
export function PostWorkoutFeedbackPrompt({
  session,
  decisions,
}: {
  session: WorkoutSession
  decisions: ProgressionDecision[]
}) {
  const queryClient = useQueryClient()
  const meQuery = useQuery(meQueryOptions())
  const sessionId = session.sessionId
  const storageKey = sessionFeedbackStorageKey(sessionId)

  // Hidden on the server and during hydration (server snapshot = handled), then the
  // client snapshot reveals the card when this session has no stored answer/dismissal.
  const storedHandled = useSyncExternalStore(
    noopSubscribe,
    () => window.localStorage.getItem(storageKey) != null,
    () => true,
  )
  const [dismissed, setDismissed] = useState(false)

  const [answer, setAnswer] = useState<FeedbackAnswer | null>(null)
  const [category, setCategory] = useState<FeedbackCategory | null>(null)
  const [message, setMessage] = useState('')
  const [done, setDone] = useState(false)

  const markHandled = () => {
    window.localStorage.setItem(storageKey, new Date().toISOString())
  }

  const mutation = useSubmitFeedback({
    onSubmitted: () => {
      markHandled()
      setDone(true)
    },
  })

  const optOutMutation = useMutation({
    mutationFn: () => dismissPostWorkoutFeedbackFn(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['me'] })
      const previous = queryClient.getQueryData<UserProfile | null>(['me'])
      if (previous) {
        queryClient.setQueryData<UserProfile | null>(['me'], (current) =>
          current ? { ...current, postWorkoutFeedbackDismissed: true } : current,
        )
      }
      return { previous }
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData<UserProfile | null>(['me'], context?.previous ?? null)
      notifications.show({
        color: 'danger',
        title: 'Could not turn this off',
        message: getApiErrorMessage(error, 'Unable to hide the feedback prompt.'),
      })
    },
    onSuccess: (profile) => {
      queryClient.setQueryData<UserProfile | null>(['me'], profile ?? null)
    },
  })

  if (meQuery.data?.postWorkoutFeedbackDismissed !== false) return null
  if (!done && (storedHandled || dismissed)) return null

  const route = `/sessions/${sessionId}/summary`
  const metadata = {
    templateId: session.templateId,
    weekIndex: session.weekIndex,
    programTitle: session.programTitle,
    decisionCount: decisions.length,
    decisionIds: decisions.map((decision) => decision.id),
  }

  if (done) {
    return (
      <Panel p="md" style={{ borderColor: 'var(--vf-success-border)' }} data-testid="post-workout-feedback">
        <Caption component="p" tone="success" fw={700}>
          Thanks — noted. This helps improve the beta.
        </Caption>
      </Panel>
    )
  }

  const showReasons = answer === 'no' || answer === 'not_sure'

  const handleAnswer = (next: FeedbackAnswer) => {
    if (mutation.isPending) return
    setAnswer(next)
    if (next === 'yes') {
      mutation.mutate({ source: 'post_workout', answer: 'yes', sessionId, route, metadata })
    }
  }

  const handleDismiss = () => {
    track('post_workout_feedback_dismiss', { sessionId })
    markHandled()
    setDismissed(true)
  }

  const handleSendReason = () => {
    if (!answer || !category || mutation.isPending) return
    mutation.mutate({ source: 'post_workout', answer, category, message, sessionId, route, metadata })
  }

  return (
    <Panel p="md" style={{ borderColor: 'var(--vf-action-border)' }} data-testid="post-workout-feedback">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <SectionLabel>Beta check-in</SectionLabel>
          <Text component="p" mt={6} size="sm" fw={800}>
            Did Sheetless explain your next workout clearly?
          </Text>
        </div>
        <ActionIcon
          variant="subtle"
          color="neutral"
          aria-label="Dismiss feedback prompt"
          onClick={handleDismiss}
        >
          <X size={16} />
        </ActionIcon>
      </div>

      <div className="mt-3">
        <FeedbackChipGroup
          label="Was the next workout clear?"
          options={postWorkoutAnswerOptions}
          value={answer}
          onChange={handleAnswer}
          disabled={mutation.isPending}
        />
      </div>

      {showReasons ? (
        <div className="mt-4 space-y-3">
          <div>
            <Caption component="p" fw={700}>
              What was confusing?
            </Caption>
            <div className="mt-2">
              <FeedbackChipGroup
                label="What was confusing?"
                options={postWorkoutReasonOptions}
                value={category}
                onChange={setCategory}
                disabled={mutation.isPending}
              />
            </div>
          </div>
          <Textarea
            label="Anything else? (optional)"
            placeholder="What did you expect Sheetless to do instead?"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            autosize
            minRows={2}
            maxLength={FEEDBACK_MESSAGE_MAX}
            disabled={mutation.isPending}
            styles={feedbackFieldStyles}
            data-testid="post-workout-feedback-message"
          />
          <Button
            size="xs"
            disabled={!category}
            loading={mutation.isPending}
            onClick={handleSendReason}
            data-testid="send-post-workout-feedback"
          >
            Send feedback
          </Button>
        </div>
      ) : (
        <Button
          className="mt-3"
          variant="subtle"
          size="xs"
          color="neutral"
          disabled={optOutMutation.isPending}
          onClick={() => {
            track('post_workout_feedback_optout')
            optOutMutation.mutate()
          }}
        >
          Don't ask again
        </Button>
      )}
    </Panel>
  )
}
