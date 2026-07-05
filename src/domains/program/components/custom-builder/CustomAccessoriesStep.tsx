import { Button, Tooltip } from '@mantine/core'
import { Plus } from 'lucide-react'
import { Caption, Panel, Text } from '~/components'
import type { GuidanceIssue } from '~/domains/program/lib/custom-builder-guidance'
import {
  accessoryMovementOptions,
  customBuilderDayTitle,
  mainWorkSummary,
  variationSummary,
} from '~/domains/program/lib/custom-builder-ui'
import { MAX_ACCESSORIES_PER_DAY, type CustomProgramBuilderInput } from '~/domains/program/lib/custom-templates'
import { GuidanceList, issuesForScope } from './CustomBuilderGuidance'
import { BuilderExerciseRow, BuilderNumberField, BuilderSelect, DeleteRowAction } from './CustomBuilderFields'

export function CustomAccessoriesStep({
  draft,
  issues,
  onAccessoryChange,
  onAddAccessory,
  onRemoveAccessory,
}: {
  draft: CustomProgramBuilderInput
  issues: GuidanceIssue[]
  onAccessoryChange: (
    sessionIndex: number,
    accessoryIndex: number,
    patch: Partial<CustomProgramBuilderInput['sessions'][number]['accessories'][number]>,
  ) => void
  onAddAccessory: (sessionIndex: number) => void
  onRemoveAccessory: (sessionIndex: number, accessoryIndex: number) => void
}) {
  return (
    <div className="grid gap-3">
      {draft.sessions.map((session, sessionIndex) => {
        const atAccessoryCap = session.accessories.length >= MAX_ACCESSORIES_PER_DAY
        return (
        <Panel key={sessionIndex} surface="inset" p="sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Text size="sm" fw={800}>{customBuilderDayTitle(sessionIndex, session.mainMovementId)}</Text>
              <div className="mt-2 flex flex-wrap gap-2">
                <Panel surface="panel" px="xs" py={4}>
                  <Caption fw={600}>{mainWorkSummary(draft.methodology, session)}</Caption>
                </Panel>
                <Panel surface="panel" px="xs" py={4}>
                  <Caption fw={600}>Variation: {variationSummary(session)}</Caption>
                </Panel>
              </div>
            </div>
            <Tooltip label={`Up to ${MAX_ACCESSORIES_PER_DAY} accessories per day`} disabled={!atAccessoryCap}>
              <span>
                <Button variant="default" disabled={atAccessoryCap} onClick={() => onAddAccessory(sessionIndex)}>
                  <Plus size={14} />
                  Add
                </Button>
              </span>
            </Tooltip>
          </div>
          <GuidanceList issues={issuesForScope(issues, sessionIndex)} className="mt-3" />
          <div className="mt-3 grid gap-2">
            {session.accessories.map((accessory, accessoryIndex) => (
              <BuilderExerciseRow
                key={accessoryIndex}
                select={
                  <BuilderSelect
                    label="Movement"
                    value={accessory.movementId}
                    onChange={(value) => {
                      if (!value) return
                      onAccessoryChange(sessionIndex, accessoryIndex, { movementId: value })
                    }}
                    options={accessoryMovementOptions.map((movement) => ({ value: movement.id, label: movement.name }))}
                  />
                }
                numbers={
                  <>
                    <BuilderNumberField
                      label="Sets"
                      value={accessory.setCount}
                      min={1}
                      max={8}
                      onChange={(value) => onAccessoryChange(sessionIndex, accessoryIndex, { setCount: value })}
                    />
                    <BuilderNumberField
                      label="Min"
                      value={accessory.repMin}
                      min={1}
                      max={50}
                      onChange={(value) => onAccessoryChange(sessionIndex, accessoryIndex, { repMin: value })}
                    />
                    <BuilderNumberField
                      label="Max"
                      value={accessory.repMax}
                      min={1}
                      max={50}
                      onChange={(value) => onAccessoryChange(sessionIndex, accessoryIndex, { repMax: value })}
                    />
                  </>
                }
                numberColumns="three"
                action={
                  <DeleteRowAction
                    label="Remove accessory"
                    onClick={() => onRemoveAccessory(sessionIndex, accessoryIndex)}
                  />
                }
              />
            ))}
            {!session.accessories.length ? (
              <Panel surface="panel" p="sm">
                <Text size="sm" tone="dimmed">No accessories yet — add some, or keep the day to just the main lift.</Text>
              </Panel>
            ) : null}
          </div>
        </Panel>
        )
      })}
    </div>
  )
}
