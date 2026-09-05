import { createServerFn } from '@tanstack/react-start'
import {
  previewProgramEquipmentMode,
  setProgramEquipmentMode,
} from '@sheetless/data/program/equipment-mode'
import {
  previewProgramEquipmentModeInputSchema,
  setProgramEquipmentModeInputSchema,
} from '~/domains/program/lib/schemas'
import { requireProgramUser } from '~/domains/program/server/program-server'

export const previewProgramEquipmentModeFn = createServerFn({ method: 'POST' })
  .validator((data) => previewProgramEquipmentModeInputSchema.parse(data))
  .handler(async ({ data }) => previewProgramEquipmentMode(await requireProgramUser(), data))

export const setProgramEquipmentModeFn = createServerFn({ method: 'POST' })
  .validator((data) => setProgramEquipmentModeInputSchema.parse(data))
  .handler(async ({ data }) => setProgramEquipmentMode(await requireProgramUser(), data))
