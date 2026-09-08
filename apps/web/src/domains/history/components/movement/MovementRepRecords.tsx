import type { Unit } from '~/shared/types'
import type { RepMaxBest, RepMaxBests } from '~/domains/history'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import { formatCompactDate } from '~/shared/lib/dates'
import { e1rm } from '~/shared/lib/math'
import { formatLoad } from '../insight-format'

/**
 * Heaviest set at each rep count. Guided drops the e1RM column — it is the technical figure, and
 * the record itself is the load.
 */
export function MovementRepRecords({
  bests,
  units,
  guided,
}: {
  bests: RepMaxBests
  units: Unit | null
  guided: boolean
}) {
  const rows = ([
    ['1RM', bests.oneRm],
    ['3RM', bests.threeRm],
    ['5RM', bests.fiveRm],
  ] as Array<[string, RepMaxBest | null]>).filter((row): row is [string, RepMaxBest] => row[1] !== null)

  if (!rows.length) return null

  return (
    <Panel p="md">
      <SectionLabel className="mb-2">Rep records</SectionLabel>
      <div className="flex flex-col">
        {rows.map(([label, best]) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-3 border-t py-2 first:border-t-0 first:pt-0"
            style={{ borderColor: 'var(--mantine-color-default-border)' }}
          >
            <Text component="span" size="xs" fw={800} tone="dimmed">{label}</Text>
            <div className="flex min-w-0 flex-1 items-baseline justify-end gap-3" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <Text component="span" size="sm" fw={800}>
                {formatLoad(best.load, units)} × {best.reps}
              </Text>
              {guided ? null : (
                <Caption component="span">e1RM {formatLoad(e1rm(best.load, best.reps), units)}</Caption>
              )}
              <Caption component="span" className="w-16 shrink-0" ta="right">{formatCompactDate(best.date)}</Caption>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}
