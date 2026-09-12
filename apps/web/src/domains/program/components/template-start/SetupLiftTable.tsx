import { NumberInput } from '@mantine/core'
import type { SetupLiftRow } from '~/domains/program/lib/setup-lift-rows'
import { setupLabel, setupValueColumnLabel, trainingMaxFormula } from '~/domains/program/lib/setup-labels'
import { useExperienceMode } from '~/domains/account/components'
import { Caption, FormulaChip, Panel, SectionLabel, Text } from '~/components'
import { formatCompactDate } from '~/shared/lib/dates'
import type { Unit } from '~/shared/types'

/**
 * Where every load this cycle comes from.
 *
 * Full shows the whole derivation — the logged set, the e1RM it implies, the formula, and the
 * result. Guided shows the two ends of it and drops the middle. The numbers are the same; only how
 * much of the working is on screen changes.
 */
export function SetupLiftTable({
  rows,
  units,
  rounding,
  trainingMaxPercent,
  onValueChange,
}: {
  rows: SetupLiftRow[]
  units: Unit
  rounding: number
  trainingMaxPercent: number
  onValueChange: (key: string, value: number | null) => void
}) {
  const { mode, isFull, showFormulas } = useExperienceMode()
  const valueColumn = setupValueColumnLabel(rows.map((row) => row.type), mode)

  if (!rows.length) {
    return (
      <Panel p="md">
        <SectionLabel>{valueColumn}</SectionLabel>
        <Caption mt="sm" component="p">
          This programme sets its own loads — there is nothing to enter here.
        </Caption>
      </Panel>
    )
  }

  return (
    <Panel p="md">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <SectionLabel>{valueColumn}</SectionLabel>
        {isFull && showFormulas ? (
          <FormulaChip tone="muted">{trainingMaxFormula(trainingMaxPercent, rounding)}</FormulaChip>
        ) : null}
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <HeaderCell>{setupLabel('liftColumn', mode)}</HeaderCell>
              <HeaderCell>{setupLabel('bestSetColumn', mode)}</HeaderCell>
              {isFull ? <HeaderCell align="right">{setupLabel('e1rmColumn', mode)}</HeaderCell> : null}
              <HeaderCell align="right">{valueColumn}</HeaderCell>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <BodyCell>
                  <Text size="sm" fw={700}>{row.label}</Text>
                </BodyCell>
                <BodyCell>
                  {row.bestSet ? (
                    <>
                      <Text size="sm">{`${row.bestSet.load} ${units} × ${row.bestSet.reps}`}</Text>
                      <Caption mt={1}>{formatCompactDate(row.bestSet.date) ?? row.bestSet.date}</Caption>
                    </>
                  ) : (
                    /* Never show an estimate as if it were a logged set. */
                    <Caption>{row.source === 'estimate' ? 'From your saved estimate' : 'No estimate yet'}</Caption>
                  )}
                </BodyCell>
                {isFull ? (
                  <BodyCell align="right">
                    <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {row.e1rm === null ? '—' : row.e1rm}
                    </Text>
                  </BodyCell>
                ) : null}
                <BodyCell align="right">
                  <NumberInput
                    size="xs"
                    w={110}
                    ml="auto"
                    hideControls
                    suffix={` ${units}`}
                    step={rounding}
                    value={row.value ?? ''}
                    aria-label={`${row.label} ${valueColumn.toLowerCase()}`}
                    onChange={(next) =>
                      onValueChange(row.key, typeof next === 'number' ? next : Number(next) || null)
                    }
                  />
                </BodyCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Caption component="p" mt="sm" lh={1.5}>
        {setupLabel('sourceNote', mode)}
      </Caption>
    </Panel>
  )
}

function HeaderCell({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className="px-1 pb-2"
      style={{ textAlign: align, borderBottom: '1px solid var(--mantine-color-default-border)' }}
    >
      <SectionLabel>{children}</SectionLabel>
    </th>
  )
}

function BodyCell({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <td
      className="px-1 py-2.5 align-middle"
      style={{ textAlign: align, borderTop: '1px solid var(--mantine-color-default-border)' }}
    >
      {children}
    </td>
  )
}
