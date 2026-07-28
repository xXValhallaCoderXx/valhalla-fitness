import { createFileRoute } from '@tanstack/react-router'
import { PrivacyPage } from '~/domains/account/components/legal/PrivacyPage'

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [
      { title: 'Privacy Policy | Sheetless' },
      {
        name: 'description',
        content: 'How Sheetless collects, uses, protects, exports, and deletes personal data.',
      },
    ],
  }),
  component: PrivacyPage,
})
