import type { Unit } from '~/shared/types'
import { LineChart } from '@mantine/charts'
import type { E1rmPoint } from '~/domains/history'
import { TREND_MIN_POINTS } from '~/domains/history/lib/strength'
import { Caption, Panel, SectionLabel } from '~/components'
import { formatCompactDate } from '~/shared/lib/dates'
import { formatNumber } from '../insight-format'

/**
 * e1RM by session, with the training max as a reference line.
 *
 * Below the trend threshold this still plots the points it has rather than replacing them with a
 * caption — a single dated marker is honest and useful, and it is the treatment the bodyweight
 * card already uses. What it does not do is imply a trend, so the caption says how far off one is.
 */
export function MovementTrendChart({
  points,
  trainingMax,
  units,
  onSelectPoint,
  selectedSessionId,
}: {
  points: E1rmPoint[]
  trainingMax: number | null
  units: Unit | null
  onSelectPoint?: (point: E1rmPoint) => void
  selectedSessionId?: string | null
}) {
  if (!points.length) {
    return (
      <Panel p="md">
        <SectionLabel>e1RM by session</SectionLabel>
        <Caption mt="sm">No loaded sets for this lift in the selected range.</Caption>
      </Panel>
    )
  }

  const hasOutliers = points.some((point) => point.outlier)
  const chartData = points.map((point) => ({
    date: formatCompactDate(point.date),
    e1rm: point.outlier ? null : point.e1rm,
    flagged: point.outlier ? point.e1rm : null,
  }))
  const series = [
    { name: 'e1rm', label: 'e1RM', color: 'var(--vf-action-text)' },
    ...(hasOutliers ? [{ name: 'flagged', label: 'Looks like a typo', color: 'var(--mantine-color-dimmed)' }] : []),
  ]

  return (
    <Panel p="md">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <SectionLabel>e1RM by session{units ? ` · ${units}` : ''}</SectionLabel>
        {onSelectPoint ? <Caption>Pick a session to trace it</Caption> : null}
      </div>

      <div className="mt-3">
        <LineChart
          h={220}
          data={chartData}
          dataKey="date"
          series={series}
          curveType="linear"
          strokeWidth={2}
          dotProps={{ r: 3 }}
          withDots
          valueFormatter={(value) => (Number.isFinite(value) ? formatNumber(value) : '—')}
          yAxisProps={{ domain: ['auto', 'auto'], width: 48 }}
          xAxisProps={{ minTickGap: 24 }}
          referenceLines={
            trainingMax !== null
              ? [{ y: trainingMax, label: `TM ${formatNumber(trainingMax)}`, color: 'var(--mantine-color-dimmed)' }]
              : undefined
          }
        />
      </div>

      {points.length < TREND_MIN_POINTS ? (
        <Caption mt="sm">
          {points.length === 1 ? 'One session' : `${points.length} sessions`} in this range —{' '}
          {TREND_MIN_POINTS} are needed before a trend means anything.
        </Caption>
      ) : null}

      {onSelectPoint ? (
        <div className="mt-3 flex flex-wrap gap-1.5" role="listbox" aria-label="Sessions">
          {points.map((point) => (
            <button
              key={point.sessionId}
              type="button"
              role="option"
              aria-selected={point.sessionId === selectedSessionId}
              onClick={() => onSelectPoint(point)}
              className="rounded-md px-2 py-1"
              style={{
                border: '1px solid var(--mantine-color-default-border)',
                backgroundColor:
                  point.sessionId === selectedSessionId ? 'var(--vf-action-soft)' : 'transparent',
              }}
            >
              <Caption>{formatCompactDate(point.date)}</Caption>
            </button>
          ))}
        </div>
      ) : null}
    </Panel>
  )
}
