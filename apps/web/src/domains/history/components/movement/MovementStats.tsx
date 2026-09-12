import type { Unit } from '~/shared/types'
import type { E1rmPoint } from '~/domains/history'
import { useExperienceMode } from '~/domains/account/components'
import { Caption, Panel, SectionLabel, StatValue } from '~/components'
import { formatLoad } from '../insight-format'
import { formatCompactDate } from '~/shared/lib/dates'

export type MovementStat = {
  label: string
  value: string
  detail: string | null
}

/**
 * The four figures that answer "is this lift going up".
 *
 * Guided names them in plain words; Full uses the notation. Every one is derived from points the
 * dashboard already carries — nothing here is fetched.
 */
export function buildMovementStats({
  points,
  trainingMax,
  units,
  guided,
}: {
  points: E1rmPoint[]
  trainingMax: number | null
  units: Unit | null
  guided: boolean
}): MovementStat[] {
  const clean = points.filter((point) => !point.outlier)
  const best = clean.reduce<E1rmPoint | null>((top, point) => (!top || point.e1rm > top.e1rm ? point : top), null)
  const heaviest = clean.reduce<E1rmPoint | null>((top, point) => (!top || point.load > top.load ? point : top), null)
  const first = clean[0]
  const last = clean[clean.length - 1]

  const stats: MovementStat[] = [
    {
      label: guided ? 'Best estimated max' : 'Best e1RM',
      value: best ? (formatLoad(best.e1rm, units) ?? '—') : '—',
      detail: best ? `${formatCompactDate(best.date)} · ${best.load} × ${best.reps}` : null,
    },
    {
      label: 'Heaviest set',
      value: heaviest ? `${heaviest.load} × ${heaviest.reps}` : '—',
      detail: heaviest ? formatCompactDate(heaviest.date) : null,
    },
  ]

  if (trainingMax !== null) {
    const best1rm = best?.e1rm ?? 0
    stats.push({
      label: guided ? 'Training weight' : 'Training max',
      value: formatLoad(trainingMax, units) ?? '—',
      detail: best1rm > 0 ? `${Math.round((trainingMax / best1rm) * 100)}% of best` : null,
    })
  }

  if (first && last && first !== last) {
    const change = Math.round((last.e1rm - first.e1rm) * 10) / 10
    stats.push({
      label: 'Change in range',
      value: `${change > 0 ? '+' : ''}${formatLoad(change, units) ?? '—'}`,
      detail: `${formatCompactDate(first.date)} – ${formatCompactDate(last.date)}`,
    })
  }

  return stats
}

export function MovementStats({ stats }: { stats: MovementStat[] }) {
  const { mode } = useExperienceMode()
  return (
    <div
      key={mode}
      className="grid gap-px [grid-template-columns:repeat(auto-fit,minmax(10rem,1fr))]"
      style={{ backgroundColor: 'var(--mantine-color-default-border)' }}
    >
      {stats.map((stat) => (
        <Panel key={stat.label} p="sm" radius={0} className="min-w-0">
          <SectionLabel truncate>{stat.label}</SectionLabel>
          <StatValue size="lg" mt={2}>
            {stat.value}
          </StatValue>
          {stat.detail ? <Caption mt={1} truncate>{stat.detail}</Caption> : null}
        </Panel>
      ))}
    </div>
  )
}
