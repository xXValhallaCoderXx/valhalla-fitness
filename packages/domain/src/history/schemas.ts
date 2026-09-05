import { z } from 'zod'

const movementIdentifier = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/,
    'Movement ID must use only letters, numbers, underscores, or hyphens.',
  )

export const movementHistoryInputSchema = z
  .object({
    movementId: movementIdentifier,
  })
  .strict()
