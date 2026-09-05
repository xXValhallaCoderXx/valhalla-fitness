import { Badge, Button, TextInput } from '@mantine/core'
import { Calculator, Gauge, X } from 'lucide-react'
import { Caption, Panel, SectionLabel } from '~/components'
import {
  hasLoadDefault,
  loadDefaultFromInput,
  oneRepMaxKeys,
  strengthEstimateLabel,
} from '~/domains/account/lib/settings-form'
import type { ProgramStateDefaults, Unit } from '~/shared/types'
import { SettingsSection } from './SettingsSection'

export function StrengthEstimatesSection({
  programStateDefaults,
  units,
  onUpdateDefault,
  onOpenCalculator,
}: {
  programStateDefaults: ProgramStateDefaults
  units: Unit
  onUpdateDefault: (key: string, value: number | null) => void
  onOpenCalculator: () => void
}) {
  return (
    <SettingsSection
      id="programme-loads"
      icon={Gauge}
      title="Strength Estimates"
      description="Saved estimated 1RMs are used to suggest starting values when you begin a programme."
      actions={
        <Button data-tour="settings-e1rm-calc" size="sm" onClick={onOpenCalculator}>
          <Calculator size={14} />
          Calculate from known sets
        </Button>
      }
    >
      <Panel p="md">
        <div data-tour="settings-estimates" className="grid grid-cols-2 gap-2 md:[grid-template-columns:repeat(auto-fit,minmax(11rem,1fr))]">
          {oneRepMaxKeys.map((key) => {
            const value = programStateDefaults[key] ?? null
            const label = strengthEstimateLabel(key)
            const isSet = hasLoadDefault(value)
            return (
              <Panel key={key} surface="inset" p="xs" className="grid min-w-0 gap-1.5">
                <div className="flex min-w-0 items-center justify-between gap-1">
                  <SectionLabel className="min-w-0" lh={1.1} truncate>
                    {label}
                  </SectionLabel>
                  <Badge className="shrink-0" color={isSet ? 'success' : 'warning'}>
                    {isSet ? 'Set' : 'Unset'}
                  </Badge>
                </div>
                <span className="relative block pt-1">
                  <TextInput
                    classNames={{ input: 'pr-24 text-right' }}
                    type="number"
                    placeholder="Unset"
                    value={value ?? ''}
                    onChange={(event) => onUpdateDefault(key, loadDefaultFromInput(event.target.value))}
                  />
                  <span className="pointer-events-none absolute right-14 top-1/2 -translate-y-1/2">
                    <Caption fw={800}>
                      {units}
                    </Caption>
                  </span>
                  <button
                    type="button"
                    aria-label={`Clear ${label}`}
                    className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition"
                    onClick={() => onUpdateDefault(key, null)}
                  >
                    <X size={14} color="var(--mantine-color-dimmed)" />
                  </button>
                </span>
              </Panel>
            )
          })}
        </div>
        <Caption mt="md" lh={1.4}>
          These estimates are global defaults. Active programmes keep their own load values after start, and
          history can still show e1RM trends from logged sets.
        </Caption>
      </Panel>
    </SettingsSection>
  )
}
