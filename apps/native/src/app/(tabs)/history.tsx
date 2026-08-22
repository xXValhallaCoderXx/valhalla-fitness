import { EmptyState, PageHeader, Screen } from '@/components'

export default function HistoryScreen() {
  return (
    <Screen>
      <PageHeader title="Insights" subtitle="Trends, records, and training signals." />
      <EmptyState title="Insights stay web-first for now">
        The deep analysis lives at sheetless.fitness; a lite summary lands here later.
      </EmptyState>
    </Screen>
  )
}
