import { createServerFn } from '@tanstack/react-start'
import { listMovementSwapOptions, substituteMovement } from '@sheetless/data/session/movements'
import {
  sessionExerciseInputSchema,
  substituteMovementInputSchema,
} from '~/domains/session/lib/schemas'
import { requireSessionUser } from '~/domains/session/server/session-server'

export const listMovementSwapOptionsFn = createServerFn({ method: 'GET' })
  .validator((data) => sessionExerciseInputSchema.parse(data))
  .handler(async ({ data }) => listMovementSwapOptions(await requireSessionUser(), data))

export const substituteMovementFn = createServerFn({ method: 'POST' })
  .validator((data) => substituteMovementInputSchema.parse(data))
  .handler(async ({ data }) => substituteMovement(await requireSessionUser(), data))
