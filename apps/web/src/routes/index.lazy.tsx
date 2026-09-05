import { createLazyFileRoute } from '@tanstack/react-router'
import { MarketingPage } from '~/domains/marketing/components/MarketingPage'

export const Route = createLazyFileRoute('/')({
  component: MarketingPage,
})
