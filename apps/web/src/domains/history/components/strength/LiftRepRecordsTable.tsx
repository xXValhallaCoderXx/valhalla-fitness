import type { RepMaxBests } from '~/domains/history'
import type { Unit } from '~/shared/types'
import { useExperienceMode } from '~/domains/account/components'
import { formatDayMonth } from '~/shared/lib/dates'
import { Caption, SectionLabel } from '~/components'
import { InsightTable, Td, Th } from '../insights/InsightTable'
import { formatLoad } from '../insight-format'

/**
 * The heaviest set at each rep count.
 *
 * Guided drops the e1RM column — it is an estimate *of* these rows, and Guided already reads the
 * estimate at the top of the card.
 */
export function LiftRepRecordsTable({ bests, units }: { bests: RepMaxBests; units: Unit | null }) {
  const { isFull } = useExperienceMode()
  const rows = (
    [
      ['1', bests.oneRm],
      ['3', bests.threeRm],
      ['5', bests.fiveRm],
    ] as const
  ).filter(([, best]) => best !== null)

  if (!rows.length) return null

  return (
    <div className="mt-3">
      <SectionLabel className="mb-1">Rep records</SectionLabel>
      <InsightTable minWidth="18rem">
        <thead>
          <tr>
            <Th>Reps</Th>
            <Th align="right">Load</Th>
            {isFull ? <Th align="right">e1RM</Th> : null}
            <Th align="right">Date</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([reps, best]) => (
            <tr key={reps}>
              <Td><Caption fw={800}>{reps}+</Caption></Td>
              <Td align="right">
                <Caption fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatLoad(best!.load, units)}
                </Caption>
              </Td>
              {isFull ? (
                <Td align="right">
                  <Caption tone="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {Math.round(best!.load * (1 + best!.reps / 30) * 10) / 10}
                  </Caption>
                </Td>
              ) : null}
              <Td align="right"><Caption tone="dimmed">{formatDayMonth(best!.date)}</Caption></Td>
            </tr>
          ))}
        </tbody>
      </InsightTable>
    </div>
  )
}
