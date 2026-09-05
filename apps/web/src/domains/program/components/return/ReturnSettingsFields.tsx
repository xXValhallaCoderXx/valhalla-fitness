import type { Dispatch, SetStateAction } from 'react'
import type { ProgramInstance, ReturnSettings } from '@sheetless/domain/program/types'
import type { buildReturnPreview } from '@sheetless/domain/program/return-preview'
import { Button, NumberInput } from '@mantine/core'
import { Panel, SectionLabel } from '~/components'

export function ReturnSettingsFields({
  program,
  settings,
  setSettings,
  preview,
  editing,
}: {
  program: ProgramInstance
  settings: ReturnSettings
  setSettings: Dispatch<SetStateAction<ReturnSettings>>
  preview: ReturnType<typeof buildReturnPreview>
  editing: boolean
}) {
  const updateStage = (index: number, update: Partial<ReturnSettings['stages'][number]>) =>
    setSettings((current) => ({
      ...current,
      stages: current.stages.map((stage, i) => (i === index ? { ...stage, ...update } : stage)),
    }))
  return (
    <>
      {settings.stages.map((stage, index) => (
        <Panel key={index} surface="inset" p="sm">
          <SectionLabel>Stage {index + 1}</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberInput
              label="Qualifying workouts"
              value={stage.workouts}
              min={1}
              max={100}
              onChange={(value) => updateStage(index, { workouts: Number(value) })}
            />
            <NumberInput
              label="Normal sets (%)"
              value={stage.setFraction * 100}
              min={0}
              max={100}
              onChange={(value) => updateStage(index, { setFraction: Number(value) / 100 })}
            />
          </div>
          <details>
            <summary>Adjust individual exercise set counts</summary>
            {[
              ...new Map(
                preview.upcoming.flatMap((session) =>
                  session.movements.map((movement) => [movement.slotId!, movement] as const),
                ),
              ).values(),
            ].map((movement) => (
              <NumberInput
                key={movement.slotId}
                label={movement.movementName}
                description="Leave blank to use the stage percentage. Essential sets are preserved."
                value={stage.setCounts[movement.slotId!] ?? ''}
                min={1}
                max={100}
                onChange={(value) => {
                  const counts = { ...stage.setCounts }
                  if (typeof value === 'number') counts[movement.slotId!] = value
                  else delete counts[movement.slotId!]
                  updateStage(index, { setCounts: counts })
                }}
              />
            ))}
          </details>
        </Panel>
      ))}
      {editing && settings.stages.length < 8 ? (
        <Button
          variant="default"
          onClick={() =>
            setSettings((current) => ({
              ...current,
              stages: [
                ...current.stages,
                {
                  ...current.stages[current.stages.length - 1],
                  workouts: program.templateDefinition!.daysPerWeek,
                },
              ],
            }))
          }
        >
          Add another rotation
        </Button>
      ) : null}
      <NumberInput
        label="Minimum repetitions in reserve"
        value={settings.minimumRir}
        min={3}
        max={10}
        onChange={(value) => setSettings((current) => ({ ...current, minimumRir: Number(value) }))}
      />
      <NumberInput
        label={`Maximum suggested increase (${program.units})`}
        description={`Default: one ${program.rounding} ${program.units} programme step. Zero holds increases.`}
        value={settings.defaultCap}
        min={0}
        max={100}
        onChange={(value) => setSettings((current) => ({ ...current, defaultCap: Number(value) }))}
      />
      <details>
        <summary>Adjust caps for individual programme references</summary>
        {preview.changes
          .filter((change) => change.kind === 'state')
          .map((change) => (
            <NumberInput
              key={change.key}
              label={change.label}
              value={settings.caps[change.key] ?? settings.defaultCap}
              min={0}
              max={100}
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  caps: { ...current.caps, [change.key]: Number(value) },
                }))
              }
            />
          ))}
      </details>
    </>
  )
}
