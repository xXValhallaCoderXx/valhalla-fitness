import { Badge } from '@mantine/core'
import {
  templateSetRows,
  type TemplateGridCell,
  type TemplateGridColumn,
  type TemplateGridRow,
} from '~/domains/program/lib/template-grid'
import { Caption, FormulaChip, Panel, SectionLabel, Text } from '~/components'
import type { Unit } from '~/shared/types'
import { TemplateCellSetsTable } from './TemplateCellSetsTable'

/**
 * One cell, all the way down: its sets, the formula behind the selected one, and the DSL fragment
 * that produced it.
 *
 * The raw definition is shown because the grid's claim is that it *is* the DSL — a grid you cannot
 * check against the source is just a table.
 */
export function TemplateCellInspector({
  cell,
  row,
  column,
  rounding,
  units,
  stateValues,
  showFormulas,
}: {
  cell: TemplateGridCell
  row: TemplateGridRow
  /** The week this cell sits in — the comp names it in the title, and it carries the phase. */
  column: TemplateGridColumn | null
  rounding: number
  units: Unit
  stateValues: Record<string, number>
  showFormulas: boolean
}) {
  const prescription = cell.prescription
  if (!prescription) {
    return (
      <Panel p="md" data-testid="template-cell-inspector">
        <SectionLabel>Cell</SectionLabel>
        <Text mt={2} size="sm" fw={800}>{cell.address}</Text>
        <Caption mt="sm" component="p">This week declares no work for this slot.</Caption>
      </Panel>
    )
  }

  const slot = { movementId: row.movementId, anchorMovementId: row.anchorMovementId ?? undefined }
  const rows = templateSetRows({ prescription, slot, rounding, stateValues })
  const topFormula = rows.find((entry) => entry.formula.stateKey)?.formula ?? rows[0]?.formula ?? null

  return (
    <Panel p="md" className="space-y-4" data-testid="template-cell-inspector">
      <div>
        <SectionLabel>Cell</SectionLabel>
        <Text mt={2} size="sm" fw={800} className="font-mono">{cell.address}</Text>
        <Text mt={1} size="sm" fw={800}>
          {row.movementName}
          {column ? ` · ${column.label}` : ''}
        </Text>
        <Caption mt={1}>
          {row.role}
          {row.progressionRuleId ? ` · ${row.progressionRuleId}` : ''}
          {column ? ` · ${column.phaseLabel} · ${column.hardness}` : ''}
        </Caption>
      </div>

      <TemplateCellSetsTable rows={rows} units={units} />

      {showFormulas && topFormula ? (
        <div>
          <SectionLabel className="mb-2">Formula</SectionLabel>
          <div className="flex flex-col items-start gap-1.5">
            <FormulaChip tone="muted">{topFormula.expression}</FormulaChip>
            {topFormula.substituted ? (
              <FormulaChip result={topFormula.result === null ? undefined : `${topFormula.result}`}>
                {topFormula.substituted}
              </FormulaChip>
            ) : (
              <Caption>Resolves once this programme has a starting number for {row.movementName}.</Caption>
            )}
          </div>
        </div>
      ) : null}

      <div>
        <div className="mb-2 flex items-center gap-2">
          <SectionLabel>Definition</SectionLabel>
          <Badge color="neutral" variant="light" size="xs">2026.06.dsl</Badge>
        </div>
        <pre
          className="overflow-x-auto rounded-md p-2 font-mono"
          style={{
            backgroundColor: 'var(--vf-surface-inset)',
            border: '1px solid var(--mantine-color-default-border)',
            fontSize: '0.6875rem',
            lineHeight: 1.5,
          }}
        >
          {JSON.stringify(prescription, null, 2)}
        </pre>
      </div>
    </Panel>
  )
}
