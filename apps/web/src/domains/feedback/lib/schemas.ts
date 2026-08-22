import { z } from 'zod'
import {
  FEEDBACK_ANSWERS,
  FEEDBACK_CATEGORIES,
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_SOURCES,
} from '~/domains/feedback/lib/feedback-options'

const route = z.string().trim().max(300).nullable().optional()
const databaseId = z.string().uuid().nullable().optional()
const metadata = z
  .record(z.string().trim().min(1).max(100), z.json())
  .superRefine((value, context) => {
    if (Object.keys(value).length > 50) {
      context.addIssue({
        code: 'custom',
        message: 'Feedback metadata cannot contain more than 50 fields.',
      })
    }
    if (JSON.stringify(value).length > 16_000) {
      context.addIssue({
        code: 'custom',
        message: 'Feedback metadata is too large.',
      })
    }
  })
  .optional()

export const submitFeedbackInputSchema = z
  .object({
    source: z.enum(FEEDBACK_SOURCES),
    answer: z.enum(FEEDBACK_ANSWERS).nullable().optional(),
    category: z.enum(FEEDBACK_CATEGORIES).nullable().optional(),
    message: z.string().trim().max(FEEDBACK_MESSAGE_MAX).nullable().optional(),
    route,
    sessionId: databaseId,
    decisionId: databaseId,
    metadata,
  })
  .strict()
  .superRefine((input, context) => {
    if (input.answer != null && input.source !== 'post_workout') {
      context.addIssue({
        code: 'custom',
        path: ['answer'],
        message: 'Feedback answers only apply to the post-workout prompt.',
      })
    }
    if (input.source === 'post_workout' && input.sessionId == null) {
      context.addIssue({
        code: 'custom',
        path: ['sessionId'],
        message: 'Post-workout feedback requires a session ID.',
      })
    }
    if (input.source === 'decision' && input.decisionId == null) {
      context.addIssue({
        code: 'custom',
        path: ['decisionId'],
        message: 'Decision feedback requires a decision ID.',
      })
    }

    const hasMessage = Boolean(input.message?.trim())
    if (input.answer == null && input.category == null && !hasMessage) {
      context.addIssue({
        code: 'custom',
        message: 'Feedback needs an answer, a category, or a message.',
      })
    }
  })
