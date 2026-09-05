import { createFileRoute } from '@tanstack/react-router'
import { TermsPage } from '~/domains/account/components/legal/TermsPage'

export const Route = createFileRoute('/terms')({
  head: () => ({
    meta: [
      { title: 'Terms of Use | Sheetless' },
      {
        name: 'description',
        content: 'Terms governing use of the Sheetless public beta.',
      },
    ],
  }),
  component: TermsPage,
})
