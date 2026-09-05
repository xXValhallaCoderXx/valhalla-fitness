import { useMutation } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import type { SubmitFeedbackInput } from '~/domains/feedback/lib/feedback-options'
import { submitFeedbackFn } from '~/domains/feedback/server/feedback-functions'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { track } from '~/shared/lib/analytics'

/** Fire-and-forget feedback submit: success/error toasts, no cache invalidation. */
export function useSubmitFeedback(options?: { onSubmitted?: (input: SubmitFeedbackInput) => void }) {
  return useMutation({
    mutationFn: (data: SubmitFeedbackInput) => submitFeedbackFn({ data }),
    onSuccess: (_result, variables) => {
      track('feedback_submit', { source: variables.source, answer: variables.answer, category: variables.category })
      // A bare positive micro-answer is thanked inline by the prompt card; a toast on
      // top of that would be double confirmation for a single tap.
      const isBareYes = variables.source === 'post_workout' && variables.answer === 'yes' && !variables.category && !variables.message
      if (!isBareYes) {
        notifications.show({
          color: 'success',
          title: 'Feedback sent',
          message: 'Thanks — this helps improve the beta.',
        })
      }
      options?.onSubmitted?.(variables)
    },
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not send feedback',
        message: getApiErrorMessage(error, 'Unable to send feedback.'),
      })
    },
  })
}
