import { createServerFn } from '@tanstack/react-start'
import {
  deleteBodyweightEntry,
  getBodyweightEntries,
  logBodyweight,
} from '@sheetless/data/account/bodyweight'
import {
  bodyweightLogInputSchema,
  deleteBodyweightEntryInputSchema,
} from '~/domains/account/lib/schemas'

export type { BodyweightLogInput } from '~/domains/account/lib/schemas'
export { bodyweightBoundsKg, normalizeBodyweightLog } from '~/domains/account/lib/bodyweight'

async function requireUser() {
  const { requireUser } = await import('~/shared/server/require-user')
  return requireUser()
}

export const getBodyweightEntriesFn = createServerFn({ method: 'GET' }).handler(async () =>
  getBodyweightEntries(await requireUser()))

export const logBodyweightFn = createServerFn({ method: 'POST' })
  .validator((data) => bodyweightLogInputSchema.parse(data))
  .handler(async ({ data }) => logBodyweight(await requireUser(), data))

export const deleteBodyweightEntryFn = createServerFn({ method: 'POST' })
  .validator((data) => deleteBodyweightEntryInputSchema.parse(data))
  .handler(async ({ data }) => deleteBodyweightEntry(await requireUser(), data))
