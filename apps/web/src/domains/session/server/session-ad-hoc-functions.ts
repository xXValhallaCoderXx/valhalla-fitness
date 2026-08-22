import { createServerFn } from '@tanstack/react-start'
import { addAdHocExercise, removeAdHocExercise } from '@sheetless/data/session/ad-hoc-exercises'
import {
  addAdHocExerciseInputSchema,
  removeAdHocExerciseInputSchema,
} from '~/domains/session/lib/schemas'
import { requireSessionUser } from '~/domains/session/server/session-server'

export const addAdHocExerciseFn = createServerFn({ method: 'POST' })
  .validator((data) => addAdHocExerciseInputSchema.parse(data))
  .handler(async ({ data }) => addAdHocExercise(await requireSessionUser(), data))

export const removeAdHocExerciseFn = createServerFn({ method: 'POST' })
  .validator((data) => removeAdHocExerciseInputSchema.parse(data))
  .handler(async ({ data }) => removeAdHocExercise(await requireSessionUser(), data))
