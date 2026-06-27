import { createFileRoute, redirect } from '@tanstack/react-router'
import { MarketingPage } from '~/domains/marketing/components/MarketingPage'
import { marketingHead } from '~/domains/marketing/lib/marketing-head'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    if ((context as any).user) throw redirect({ to: '/today' })
  },
  head: marketingHead,
  component: MarketingPage,
})
