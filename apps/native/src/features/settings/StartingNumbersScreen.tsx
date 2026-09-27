import { Caption, Panel, SectionLabel, SegmentedControl } from '@/components'
import { spacing } from '@/lib/tokens'
import { SettingsEditor } from './SettingsEditor'
import { StrengthEstimatesSection } from './profile/StrengthEstimatesSection'

export function StartingNumbersScreen() {
  return <SettingsEditor title="Starting numbers" section="starting-numbers">
    {({ draft, disabled }) => <>
      <StrengthEstimatesSection programStateDefaults={draft.values.programStateDefaults}
        estimateInputs={draft.estimateInputs} estimateErrors={draft.estimateErrors}
        units={draft.values.units} rounding={draft.values.rounding} disabled={disabled}
        onInputChange={draft.setEstimateInput} onValueChange={draft.setEstimateValue} />
      <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
        <SectionLabel>Round starting estimates to ({draft.values.units})</SectionLabel>
        <SegmentedControl value={String(draft.values.rounding)} onChange={value => draft.setRounding(Number(value))}
          options={[...new Set([1.25, 2.5, 5, draft.values.rounding])].sort((a, b) => a - b).map(value => ({ value: String(value), label: String(value), accessibilityLabel: `${value} ${draft.values.units}` }))}
          variant="segments" appearance="inset" disabled={disabled}
          accessibilityRole="radiogroup" accessibilityLabel="Round starting estimates to" />
        <Caption>Used by the calculator and when converting saved estimates to another unit. Your active plan keeps its own rounding.</Caption>
      </Panel>
    </>}
  </SettingsEditor>
}
