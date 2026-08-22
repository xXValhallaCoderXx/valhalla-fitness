import { createServerFn } from '@tanstack/react-start'
import { deleteOwnAccount, exportAccountData } from '@sheetless/data/account/data-rights'
import { deleteAccountInputSchema } from '~/domains/account/lib/data-rights'

async function requireUser() {
  const { requireUser } = await import('~/shared/server/require-user')
  return requireUser()
}

export const exportAccountDataFn = createServerFn({ method: 'GET' }).handler(async () =>
  exportAccountData(await requireUser()))

export const deleteOwnAccountFn = createServerFn({ method: 'POST' })
  .validator((data) => deleteAccountInputSchema.parse(data))
  .handler(async ({ data }) => deleteOwnAccount(await requireUser(), data))
