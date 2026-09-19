import type { HistoryBestSet, MilestoneSummary } from '~/domains/history'
import type { Unit } from '~/shared/types'
import { formatDayMonth } from '~/shared/lib/dates'
import { InsightStatCell } from '../insights/InsightStatCell'
import { InsightStatStrip } from '../insights/InsightStatStrip'
import { formatLoad, formatNumber } from '../insight-format'

/**
 * What the record book adds up to.
 *
 * All-time by design — a personal best scoped to eight weeks is not a personal best — so no cell
 * here responds to the range switch.
 */
export function RecordsStatStrip({
  bestSets,
  milestones,
  units,
}: {
  bestSets: HistoryBestSet[]
  milestones: MilestoneSummary
  units?: Unit | null
}) {
  const heaviest = bestSets.reduce<HistoryBestSet | null>(
    (top, set) => ((set.load ?? 0) > (top?.load ?? 0) ? set : top),
    null,
  )
  const bestE1rm = bestSets.reduce<HistoryBestSet | null>(
    (top, set) => ((set.e1rm ?? 0) > (top?.e1rm ?? 0) ? set : top),
    null,
  )
  const latest = bestSets
    .map((set) => set.performedAt)
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1)
  const next = milestones.nextUp

  return (
    <InsightStatStrip
      cells={[
        <InsightStatCell
          key="heaviest"
          label="Heaviest lift"
          value={heaviest?.load ? formatLoad(heaviest.load, units) : '—'}
          subline={heaviest?.load ? `${heaviest.movementName} · ${formatDayMonth(heaviest.performedAt)}` : 'no loaded sets yet'}
        />,
        <InsightStatCell
          key="e1rm"
          label="Best e1RM"
          value={bestE1rm?.e1rm ? formatNumber(bestE1rm.e1rm) : '—'}
          subline={bestE1rm?.e1rm ? `${bestE1rm.movementName} · ${formatDayMonth(bestE1rm.performedAt)}` : 'needs a loaded set'}
        />,
        <InsightStatCell
          key="count"
          label="Records set"
          value={bestSets.length}
          subline={latest ? `most recent ${formatDayMonth(latest)}` : 'across every movement'}
        />,
        <InsightStatCell
          key="milestone"
          label="Next milestone"
          value={next ? `${next.progressPercent} %` : '—'}
          subline={next ? next.label : 'all tracked milestones earned'}
        />,
      ]}
    />
  )
}
