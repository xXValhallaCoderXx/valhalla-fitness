import { createFileRoute } from '@tanstack/react-router'
import { AccountDeletionPage } from '~/domains/account/components/legal/AccountDeletionPage'

export const Route = createFileRoute('/account-deletion')({
  head: () => ({
    meta: [
      { title: 'Delete Account | Sheetless' },
      {
        name: 'description',
        content: 'How to permanently delete a Sheetless account and its associated training data.',
      },
    ],
  }),
  component: AccountDeletionPage,
})
