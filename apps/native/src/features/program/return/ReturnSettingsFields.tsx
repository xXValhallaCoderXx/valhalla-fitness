import type { Dispatch, SetStateAction } from 'react'
import type { ProgramInstance, ReturnSettings } from '@sheetless/domain/program/types'
import type { buildReturnPreview } from '@sheetless/domain/program/return-preview'
import { useState } from 'react'
import { Button, Caption, Panel, SectionLabel } from '@/components'
import { spacing } from '@/lib/tokens'
import { ReturnNumberField } from './ReturnNumberField'

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
  const [individual, setIndividual] = useState(false)
  const updateStage = (index: number, update: Partial<ReturnSettings['stages'][number]>) =>
    setSettings((current) => ({
      ...current,
      stages: current.stages.map((stage, i) => (i === index ? { ...stage, ...update } : stage)),
    }))
  const movements = [
    ...new Map(
      preview.upcoming.flatMap((session) =>
        session.movements.map((movement) => [movement.slotId!, movement] as const),
      ),
    ).values(),
  ]
  return (
    <>
      <Button
        variant="subtle"
        label={individual ? 'Hide individual adjustments' : 'Adjust individual set counts and caps'}
        onPress={() => setIndividual(!individual)}
      />
      {settings.stages.map((stage, index) => (
        <Panel key={index} surface="inset" style={{ padding: spacing.sm, gap: spacing.sm }}>
          <SectionLabel>Stage {index + 1}</SectionLabel>
          <ReturnNumberField
            label="Qualifying workouts"
            value={stage.workouts}
            onChange={(value) => updateStage(index, { workouts: value ?? 0 })}
          />
          <ReturnNumberField
            label="Normal sets (%)"
            value={stage.setFraction * 100}
            onChange={(value) => updateStage(index, { setFraction: (value ?? 0) / 100 })}
          />
          {individual ? (
            <>
              <Caption>
                Leave counts blank to use the stage percentage. Essential sets are preserved.
              </Caption>
              {movements.map((movement) => (
                <ReturnNumberField
                  key={movement.slotId}
                  label={`${movement.movementName} sets`}
                  value={stage.setCounts[movement.slotId!] ?? null}
                  onChange={(value) => {
                    const counts = { ...stage.setCounts }
                    if (value !== null) counts[movement.slotId!] = value
                    else delete counts[movement.slotId!]
                    updateStage(index, { setCounts: counts })
                  }}
                />
              ))}
            </>
          ) : null}
        </Panel>
      ))}
      {editing && settings.stages.length < 8 ? (
        <Button
          variant="default"
          label="Add another rotation"
          onPress={() =>
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
        />
      ) : null}
      <ReturnNumberField
        label="Minimum repetitions in reserve"
        value={settings.minimumRir}
        onChange={(value) => setSettings((current) => ({ ...current, minimumRir: value ?? 0 }))}
      />
      <ReturnNumberField
        label={`Maximum suggested increase (${program.units})`}
        value={settings.defaultCap}
        onChange={(value) => setSettings((current) => ({ ...current, defaultCap: value ?? -1 }))}
      />
      <Caption>
        Default: one {program.rounding} {program.units} programme step. Zero holds increases.
        Training-max changes affect individual sets through their prescribed percentages.
      </Caption>
      {individual
        ? preview.changes
            .filter((change) => change.kind === 'state')
            .map((change) => (
              <ReturnNumberField
                key={change.key}
                label={`${change.label} cap`}
                value={settings.caps[change.key] ?? settings.defaultCap}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    caps: { ...current.caps, [change.key]: value ?? -1 },
                  }))
                }
              />
            ))
        : null}
    </>
  )
}
