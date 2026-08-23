import { Button } from '@mantine/core'
import { Caption, EmptyState, SectionLabel, Text } from '~/components'
import {
  weekOptionHeading,
  type AccessoryAdditionDraft,
  type WeekPreviewOption,
} from '~/domains/program/lib/template-start-utils'
import type { TemplatePhase, TemplateStructureMode } from '~/domains/program/lib/template-start-phases'
import type {
  ProgramSetupOptions,
  ProgramSetupPreviewMovement,
  ProgramStartAccessoryAdditionInput,
  ProgramStartMovementOverrideInput,
  FreeWeightChoiceDraft,
  ProgramEquipmentMode,
} from '~/domains/program'
import type { Unit } from '~/shared/types'
import { TemplateStartDayCard } from './TemplateStartDayCard'

export function TemplateStartPreview({
  activeWeek,
  activeWeekOption,
  weekOptions,
  mode,
  phases,
  activePhaseKey,
  changedSlots,
  units,
  equipmentProfile,
  setupOptions,
  movementOverrides,
  accessoryAdditions,
  equipmentMode,
  freeWeightChoices,
  onWeekChange,
  onMovementOverrideChange,
  onAddAccessory,
  onRemoveAccessory,
}: {
  activeWeek: ProgramSetupOptions['previewWeeks'][number] | undefined
  activeWeekOption: WeekPreviewOption | undefined
  weekOptions: WeekPreviewOption[]
  mode: TemplateStructureMode
  phases: TemplatePhase[]
  activePhaseKey: string
  changedSlots: Set<string>
  units: Unit
  equipmentProfile: readonly string[]
  setupOptions: ProgramSetupOptions
  movementOverrides: ProgramStartMovementOverrideInput[]
  accessoryAdditions: AccessoryAdditionDraft[]
  equipmentMode: ProgramEquipmentMode
  freeWeightChoices: FreeWeightChoiceDraft[]
  onWeekChange: (weekIndex: number) => void
  onMovementOverrideChange: (movement: ProgramSetupPreviewMovement, replacementMovementId: string) => void
  onAddAccessory: (addition: ProgramStartAccessoryAdditionInput) => void
  onRemoveAccessory: (clientId: string) => void
}) {
  if (!activeWeek) {
    return <EmptyState title="No preview available">This programme does not have a setup preview yet.</EmptyState>
  }

  const activePhase = phases.find((phase) => phase.phaseKey === activePhaseKey)
  const planTitle = mode === 'phased' && activePhase ? activePhase.phaseLabel : weekOptionHeading(activeWeekOption)

  return (
    <section>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <SectionLabel>Week plan</SectionLabel>
          <Text mt={4} size="lg" fw={800}>{planTitle}</Text>
          <Text mt={4} size="sm" tone="dimmed" className="max-w-3xl">{activeWeek.summary}</Text>
          {mode !== 'phased' && activeWeekOption?.detail ? (
            <Caption mt={4} fw={600}>{activeWeekOption.detail}</Caption>
          ) : null}
        </div>
        {mode === 'phased' && phases.length > 1 ? (
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1 no-scrollbar sm:pb-0">
            {phases.map((phase) => (
              <Button
                key={phase.phaseKey}
                size="xs"
                variant={phase.phaseKey === activePhaseKey ? 'filled' : 'default'}
                className="shrink-0"
                onClick={() => onWeekChange(phase.firstWeekIndex)}
              >
                {phase.phaseLabel.replace(/\s+phase$/i, '')}
              </Button>
            ))}
          </div>
        ) : mode === 'cycle' && weekOptions.length > 1 ? (
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1 no-scrollbar sm:pb-0">
            {weekOptions.map((option) => (
              <Button
                key={option.key}
                size="xs"
                variant={option.week.index === activeWeek.index ? 'filled' : 'default'}
                className="shrink-0"
                onClick={() => onWeekChange(option.week.index)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3">
        {activeWeek.sessions.map((session) => (
          <TemplateStartDayCard
            key={`${activeWeek.index}-${session.id}`}
            session={session}
            units={units}
            equipmentProfile={equipmentProfile}
            setupOptions={setupOptions}
            movementOverrides={movementOverrides}
            accessoryAdditions={accessoryAdditions}
            equipmentMode={equipmentMode}
            freeWeightChoices={freeWeightChoices}
            changedSlots={changedSlots}
            onMovementOverrideChange={onMovementOverrideChange}
            onAddAccessory={onAddAccessory}
            onRemoveAccessory={onRemoveAccessory}
          />
        ))}
      </div>
    </section>
  )
}
