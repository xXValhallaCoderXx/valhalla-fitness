import { EmptyState, PageHeader, Screen } from '@/components'

export default function TemplatesScreen() {
  return (
    <Screen>
      <PageHeader title="Programs" subtitle="Structured plans for your next cycle." />
      <EmptyState title="Browse plans on the web">
        Starting and customizing programmes stays on sheetless.fitness for now.
      </EmptyState>
    </Screen>
  )
}
