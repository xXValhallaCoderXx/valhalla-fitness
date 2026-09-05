import { createServerFn } from '@tanstack/react-start'
import { createCustomProgramTemplate, startProgram } from '@sheetless/data/program/start'
import { customProgramBuilderInputSchema } from '~/domains/program/lib/custom-templates'
import { startProgramInputSchema } from '~/domains/program/lib/schemas'
import { requireProgramUser } from '~/domains/program/server/program-server'

export const createCustomProgramTemplateFn = createServerFn({ method: 'POST' })
  .validator((data) => customProgramBuilderInputSchema.parse(data))
  .handler(async ({ data }) => createCustomProgramTemplate(await requireProgramUser(), data))

export const startProgramFn = createServerFn({ method: 'POST' })
  .validator((data) => startProgramInputSchema.parse(data))
  .handler(async ({ data }) => startProgram(await requireProgramUser(), data))
