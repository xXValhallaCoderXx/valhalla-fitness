import { createServerFn } from '@tanstack/react-start'
import {
  addSessionAccessory,
  removeSessionAccessory,
  reorderSessionAccessories,
} from '@sheetless/data/session/accessories'
import {
  addSessionAccessoryInputSchema,
  removeSessionAccessoryInputSchema,
  reorderSessionAccessoriesInputSchema,
} from '~/domains/session/lib/schemas'
import { requireSessionUser } from '~/domains/session/server/session-server'

export const addSessionAccessoryFn = createServerFn({ method: 'POST' })
  .validator((data) => addSessionAccessoryInputSchema.parse(data))
  .handler(async ({ data }) => addSessionAccessory(await requireSessionUser(), data))

export const reorderSessionAccessoriesFn = createServerFn({ method: 'POST' })
  .validator((data) => reorderSessionAccessoriesInputSchema.parse(data))
  .handler(async ({ data }) => reorderSessionAccessories(await requireSessionUser(), data))

export const removeSessionAccessoryFn = createServerFn({ method: 'POST' })
  .validator((data) => removeSessionAccessoryInputSchema.parse(data))
  .handler(async ({ data }) => removeSessionAccessory(await requireSessionUser(), data))
