import { EmptyState, PageHeader, Screen } from '@/components'

export default function ProgramScreen() {
  return (
    <Screen>
      <PageHeader title="Plan" subtitle="Your active programme, week by week." />
      <EmptyState title="Programme overview coming soon">
        Manage your plan on the web at sheetless.fitness until this lands natively.
      </EmptyState>
    </Screen>
  )
}
