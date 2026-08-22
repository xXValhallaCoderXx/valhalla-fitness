import { createServerFn } from '@tanstack/react-start'
import { addExerciseSet, upsertSetLog } from '@sheetless/data/session/sets'
import {
  addExerciseSetInputSchema,
  upsertSetLogInputSchema,
} from '~/domains/session/lib/schemas'
import { requireSessionUser } from '~/domains/session/server/session-server'

export const upsertSetLogFn = createServerFn({ method: 'POST' })
  .validator((data) => upsertSetLogInputSchema.parse(data))
  .handler(async ({ data }) => upsertSetLog(await requireSessionUser(), data))

export const addExerciseSetFn = createServerFn({ method: 'POST' })
  .validator((data) => addExerciseSetInputSchema.parse(data))
  .handler(async ({ data }) => addExerciseSet(await requireSessionUser(), data))
