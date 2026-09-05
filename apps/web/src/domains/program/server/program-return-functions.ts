import { createServerFn } from '@tanstack/react-start'
import { getReturnGuide, changeProgramReturn } from '@sheetless/data/program/return-guide'
import { changeReturnInputSchema } from '@sheetless/domain/program/return-schemas'
import { requireProgramUser } from './program-server'

export const getReturnGuideFn = createServerFn({ method: 'GET' }).handler(async () =>
  getReturnGuide(await requireProgramUser()),
)

export const changeProgramReturnFn = createServerFn({ method: 'POST' })
  .validator((data) => changeReturnInputSchema.parse(data))
  .handler(async ({ data }) => changeProgramReturn(await requireProgramUser(), data))
