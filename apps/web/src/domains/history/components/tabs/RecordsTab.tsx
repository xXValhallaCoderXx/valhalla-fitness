import { useState } from 'react'
import { groupBestSets } from '~/domains/history/lib/insights'
import { bestSetAsE1rmPoint } from '~/domains/history/lib/records-trace'
import { buildE1rmTrace } from '~/domains/history/lib/e1rm-trace'
import type { HistoryBestSet, HistoryDashboard, MilestoneSummary } from '~/domains/history'
import { useExperienceMode } from '~/domains/account/components'
import { EmptyState, InspectorLayout } from '~/components'
import { LoadTracePanel } from '~/domains/program/components/inspector/LoadTracePanel'
import { InsightTabHeader } from '../insights/InsightTabHeader'
import { MilestonesStrip } from '../cards/MilestonesStrip'
import { RecordGroup } from '../records/RecordGroup'
import { RecordsStatStrip } from '../records/RecordsStatStrip'

/**
 * Every best set, grouped by what earned it.
 *
 * Full can select a record to see where its estimate came from — a PR is exactly the number people
 * ask "where did that come from" about, and the e1RM trace already answers it.
 */
export function RecordsTab({ data, milestones }: { data: HistoryDashboard; milestones: MilestoneSummary }) {
  const { isFull, showFormulas } = useExperienceMode()
  const [selected, setSelected] = useState<HistoryBestSet | null>(null)
  const groups = groupBestSets(data.bestSets)

  if (!groups.length) {
    return <EmptyState title="No records yet">Complete sets with load and reps to build records.</EmptyState>
  }

  const point = selected ? bestSetAsE1rmPoint(selected) : null
  const trace =
    point && selected
      ? buildE1rmTrace({ point, movementName: selected.movementName, units: selected.units ?? 'kg' })
      : null

  return (
    <div>
      <InsightTabHeader
        title="Records"
        subtitle={`${data.bestSets.length} records · ${milestones.earned.length} milestone${milestones.earned.length === 1 ? '' : 's'} earned`}
        note="All-time — records are not scoped to the range."
      />

      <InspectorLayout inspector={trace ? <LoadTracePanel trace={trace} showFormulas={showFormulas} /> : null}>
        <div className="flex flex-col gap-6">
          <RecordsStatStrip bestSets={data.bestSets} milestones={milestones} units={data.overview.units} />
          {groups.map((group) => (
            <RecordGroup
              key={group.key}
              group={group}
              selectedId={selected?.id ?? null}
              onSelect={isFull ? (set) => setSelected((current) => (current?.id === set.id ? null : set)) : undefined}
            />
          ))}
          <MilestonesStrip milestones={milestones} />
        </div>
      </InspectorLayout>
    </div>
  )
}
