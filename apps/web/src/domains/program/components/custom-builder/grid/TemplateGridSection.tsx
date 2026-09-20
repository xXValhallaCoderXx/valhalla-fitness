import { useMemo, useState } from 'react'
import {
  buildTemplateGrid,
  templateDefinitionChecks,
  templateGridCellValue,
  templateGridStateValues,
  templatePrescriptionFormula,
  templateSetFormula,
} from '~/domains/program/lib/template-grid'
import { builderLabel } from '~/domains/program/lib/builder-labels'
import { setupOneRepMaxResolver } from '~/domains/program/lib/setup-lift-rows'
import type { UserProfile } from '~/domains/account'
import type { CustomProgramBuilderInput } from '~/domains/program/lib/custom-program-meta'
import { useExperienceMode } from '~/domains/account/components'
import { Caption, Panel, SectionLabel } from '~/components'
import { useDraftDefinition } from '../useDraftDefinition'
import { TemplateCellInspector } from './TemplateCellInspector'
import { TemplateFormulaBar } from './TemplateFormulaBar'
import { TemplateGridHeader } from './TemplateGridHeader'
import { TemplateGridTable } from './TemplateGridTable'
import { TemplateRequiredStateRow } from './TemplateRequiredStateRow'
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
    return templateGridStateValues({
      definition,
      resolveOneRepMax: setupOneRepMaxResolver({ liftSeries: null, defaults: profile.programStateDefaults }),
      rounding,
    })
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
  const selectedColumn = selectedCell
    ? grid.columns.find((column) => column.weekIndex === selectedCell.weekIndex) ?? null
    : null
  const cellValue = (address: string) => templateGridCellValue({ grid, address, rounding, units, stateValues })

  // The bar states the whole cell where it can: a wave is three percentages of one state, and
  // printing only the first says a third of the truth. `templateSetFormula` is the fallback for
  // prescriptions with nothing to collapse.
  const slot = selectedRow
    ? { movementId: selectedRow.movementId, anchorMovementId: selectedRow.anchorMovementId ?? undefined }
    : null
  const expression = selectedCell?.prescription && slot
    ? templatePrescriptionFormula({ prescription: selectedCell.prescription, slot, rounding, stateValues })
      ?? templateSetFormula({ set: selectedCell.prescription.sets[0] ?? {}, slot, rounding, stateValues }).expression
    : null

  return (
    <section className="mt-6">
      <TemplateGridHeader
        name={draft.name}
        heading={builderLabel('gridHeading', mode)}
        seededLabel={builderLabel('seededFromWizard', mode)}
        durationWeeks={definition.durationWeeks}
        daysPerWeek={definition.daysPerWeek}
        valid={templateDefinitionChecks(definition).valid}
        showFormulas={showFormulas}
        onShowFormulasChange={setShowFormulas}
      />

      <TemplateFormulaBar address={selectedCell?.address ?? null} expression={expression} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <div className="min-w-0">
          <Panel p="xs" className="min-w-0">
            <TemplateGridTable
              grid={grid}
              showFormulas={showFormulas}
              cellValue={cellValue}
              selectedAddress={selected}
              onSelect={setSelected}
            />
          </Panel>
          <TemplateRequiredStateRow definition={definition} stateValues={stateValues} units={units} />
        </div>
        <div className="flex flex-col gap-4">
          {selectedCell && selectedRow ? (
            <TemplateCellInspector
              cell={selectedCell}
              row={selectedRow}
              column={selectedColumn}
              rounding={rounding}
              units={units}
              stateValues={stateValues}
              showFormulas={showFormulas}
            />
          ) : null}
          <TemplateValidationPanel definition={definition} />
        </div>
      </div>
    </section>
  )
}
