import { Badge, Switch } from '@mantine/core'
import { useMemo, useState } from 'react'
import {
  buildTemplateGrid,
  templateSetFormula,
  templateSetRows,
} from '~/domains/program/lib/template-grid'
import { builderLabel } from '~/domains/program/lib/builder-labels'
import { setupOneRepMaxResolver } from '~/domains/program/lib/setup-lift-rows'
import { mround } from '~/domains/program/lib/progression'
import type { UserProfile } from '~/domains/account'
import type { CustomProgramBuilderInput } from '~/domains/program/lib/custom-program-meta'
import { useExperienceMode } from '~/domains/account/components'
import { Caption, FormulaChip, Panel, SectionLabel, Text } from '~/components'
import { useDraftDefinition } from '../useDraftDefinition'
import { TemplateCellInspector } from './TemplateCellInspector'
import { TemplateGridTable } from './TemplateGridTable'
import { TemplateValidationPanel } from './TemplateValidationPanel'

/**
 * The wizard's answers, as the spreadsheet they actually are.
 *
 * Read-only in this release: the grid shows every cell, its formula and its raw DSL, but the wizard
 * remains the only thing that writes the definition.
 */
export function TemplateGridSection({
  draft,
  profile,
}: {
  draft: CustomProgramBuilderInput
  profile: UserProfile | null
}) {
  const { mode } = useExperienceMode()
  const { definition, problem } = useDraftDefinition(draft)
  const [showFormulas, setShowFormulas] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  const rounding = profile?.rounding ?? 2.5
  const units = profile?.units ?? 'kg'

  // The same anchor resolution setup uses, so the grid's loads are the ones a lifter would get.
  const stateValues = useMemo(() => {
    if (!definition || !profile) return {}
    const resolve = setupOneRepMaxResolver({ liftSeries: null, defaults: profile.programStateDefaults })
    const values: Record<string, number> = {}
    for (const state of definition.requiredState) {
      const oneRepMax = resolve(state.movementId)
      if (oneRepMax === null) continue
      values[state.key] = state.type === 'training_max' ? mround(oneRepMax * 0.9, rounding) : mround(oneRepMax * 0.75, rounding)
    }
    return values
  }, [definition, profile, rounding])

  const grid = useMemo(() => (definition ? buildTemplateGrid(definition) : null), [definition])

  if (!definition || !grid) {
    return (
      <Panel p="md" mt="lg">
        <SectionLabel>{builderLabel('gridHeading', mode)}</SectionLabel>
        <Caption component="p" mt="sm">
          {problem ?? 'Answer the wizard to see the definition it builds.'}
        </Caption>
      </Panel>
    )
  }

  const selectedCell = selected ? grid.cells[selected] ?? null : null
  const selectedRow = selectedCell ? grid.rows.find((row) => row.key === selectedCell.rowKey) ?? null : null
  const rowFor = (address: string) => {
    const cell = grid.cells[address]
    return cell ? grid.rows.find((row) => row.key === cell.rowKey) ?? null : null
  }

  const cellValue = (address: string) => {
    const cell = grid.cells[address]
    const row = rowFor(address)
    if (!cell?.prescription || !row) return { primary: '—', secondary: null }
    const rows = templateSetRows({
      prescription: cell.prescription,
      slot: { movementId: row.movementId, anchorMovementId: row.anchorMovementId ?? undefined },
      rounding,
      stateValues,
    })
    const top = rows.find((entry) => entry.formula.result !== null) ?? rows[0]
    if (!top) return { primary: '—', secondary: null }
    if (showFormulas) return { primary: top.formula.expression, secondary: cell.prescription.targetSummary }
    return {
      primary: top.formula.result === null ? top.target : `${top.formula.result} ${units}`,
      secondary: cell.prescription.targetSummary,
    }
  }

  const formulaBar = selectedCell && selectedRow
    ? templateSetFormula({
        set: selectedCell.prescription?.sets[0] ?? {},
        slot: { movementId: selectedRow.movementId, anchorMovementId: selectedRow.anchorMovementId ?? undefined },
        rounding,
        stateValues,
      })
    : null

  return (
    <section className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SectionLabel>{builderLabel('gridHeading', mode)}</SectionLabel>
          <Badge color="neutral" variant="light" size="xs">{builderLabel('seededFromWizard', mode)}</Badge>
          <Caption>
            {definition.durationWeeks} week{definition.durationWeeks === 1 ? '' : 's'} ·{' '}
            {definition.daysPerWeek} day{definition.daysPerWeek === 1 ? '' : 's'} · read-only
          </Caption>
        </div>
        <Switch
          size="xs"
          checked={showFormulas}
          label="Formulas"
          onChange={(event) => setShowFormulas(event.currentTarget.checked)}
        />
      </div>

      {/* The formula bar names the selected cell, the way a spreadsheet's does. */}
      <Panel p="xs" className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Text component="span" size="xs" fw={800} className="font-mono" tone="dimmed">fx</Text>
          <Text component="span" size="xs" fw={800} className="font-mono">
            {selectedCell?.address ?? 'select a cell'}
          </Text>
          {formulaBar ? <FormulaChip tone="muted">{formulaBar.expression}</FormulaChip> : null}
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <Panel p="xs" className="min-w-0">
          <TemplateGridTable
            grid={grid}
            showFormulas={showFormulas}
            cellValue={cellValue}
            selectedAddress={selected}
            onSelect={setSelected}
          />
        </Panel>
        <div className="flex flex-col gap-4">
          {selectedCell && selectedRow ? (
            <TemplateCellInspector
              cell={selectedCell}
              row={selectedRow}
              rounding={rounding}
              units={units}
              stateValues={stateValues}
              showFormulas={showFormulas}
            />
          ) : null}
          <TemplateValidationPanel definition={definition} stateValues={stateValues} units={units} />
        </div>
      </div>
    </section>
  )
}
