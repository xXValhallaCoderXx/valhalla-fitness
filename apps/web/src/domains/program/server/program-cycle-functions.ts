import { createServerFn } from '@tanstack/react-start'
import { getCycleReview, repeatProgramCycle } from '@sheetless/data/program/cycle-boundary'
import { endProgram } from '@sheetless/data/program/ending'
import { cycleReviewInputSchema, repeatCycleInputSchema } from '@sheetless/domain/program/cycle-schemas'
import { endProgramInputSchema } from '@sheetless/domain/program/ending'
import { requireProgramUser } from './program-server'

export const getCycleReviewFn = createServerFn({ method: 'GET' })
  .validator((data) => cycleReviewInputSchema.parse(data))
  .handler(async ({ data }) => getCycleReview(await requireProgramUser(), data))
export const repeatProgramCycleFn = createServerFn({ method: 'POST' })
  .validator((data) => repeatCycleInputSchema.parse(data))
  .handler(async ({ data }) => repeatProgramCycle(await requireProgramUser(), data))
export const endCycleProgramFn = createServerFn({ method: 'POST' })
  .validator((data) => endProgramInputSchema.parse(data))
  .handler(async ({ data }) => endProgram(await requireProgramUser(), data))
