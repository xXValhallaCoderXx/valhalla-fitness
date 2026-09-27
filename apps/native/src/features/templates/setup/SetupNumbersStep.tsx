import { useState } from 'react'
import { View } from 'react-native'
import {
  canChangeSetupUnits, changeSetupUnits, editSetupValue, positiveSetupInput, suggestionForDraft,
  updateSetupSettings, useSetupSuggestion as applySetupSuggestion, type NativeProgramSetupDraft,
} from '@sheetless/domain/program/native-setup-draft'
import { getMovementName } from '@sheetless/domain/movement/movements'
import { formatStateType } from '@sheetless/domain/program/template-start-utils'
import { convertWeight } from '@sheetless/domain/shared/math'
import { Button, Caption, Panel, SectionLabel, SegmentedControl, Text, TextInput } from '@/components'
import { spacing } from '@/lib/tokens'

export function SetupNumbersStep({ draft, update, disabled, retrying, onRetry, advanced = false }: {
  draft: NativeProgramSetupDraft
  update: (updater: (current: NativeProgramSetupDraft) => NativeProgramSetupDraft) => void
  disabled: boolean; retrying: boolean; onRetry: () => void; advanced?: boolean
}) {
  const [details, setDetails] = useState<string[]>([])
  const training = draft.snapshot.stateValues.some((state) => state.type === 'training_max')
  const working = draft.snapshot.stateValues.some((state) => state.type === 'working_load')
  return <>
    <Text weight={800}>Your starting numbers</Text>
    <Caption>Recorded lifts come first, then your saved estimates. Edit any suggestion. Your profile estimates stay unchanged.</Caption>
    {draft.snapshot.unknownUnitSessions > 0 ? <Caption>{draft.snapshot.unknownUnitSessions} older workout(s) have unknown units and cannot supply starting suggestions.</Caption> : null}
    {draft.snapshot.historyStatus === 'unavailable' ? <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
      <Text tone="warning">Workout history could not load. Saved estimates and manual entry are available.</Text>
      <Button label="Retry workout history" variant="default" loading={retrying} disabled={disabled} onPress={onRetry} />
    </Panel> : null}
    <SegmentedControl variant="segments" accessibilityLabel="Starting weight units" value={draft.units}
      options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]}
      disabled={disabled || !canChangeSetupUnits(draft)} onChange={(units: 'kg' | 'lb') => update((current) => changeSetupUnits(current, units))} />
    {!canChangeSetupUnits(draft) ? <Caption tone="warning">Finish or correct your number before changing units.</Caption> : null}
    <Caption>Changing units converts your edits and rounds them to the selected increment.</Caption>
    <SectionLabel>Round suggested loads to</SectionLabel>
    <SegmentedControl variant="segments" accessibilityLabel="Starting weight rounding" value={String(draft.rounding)}
      options={[...new Set([draft.units === 'kg' ? 1 : 2.5, draft.units === 'kg' ? 2.5 : 5, draft.units === 'kg' ? 5 : 10, draft.rounding])].sort((a, b) => a - b).map((value) => ({ value: String(value), label: `${value} ${draft.units}` }))}
      disabled={disabled} onChange={(value: string) => update((current) => updateSetupSettings(current, { rounding: Number(value) }))} />
    {training ? <Percentage label="Training max" value={draft.trainingMaxPercent} min={80} max={95} disabled={disabled}
      onChange={(trainingMaxPercent) => update((current) => updateSetupSettings(current, { trainingMaxPercent }))} /> : null}
    {working ? <Percentage label="Working load" value={draft.workingLoadPercent} min={60} max={90} disabled={disabled}
      onChange={(workingLoadPercent) => update((current) => updateSetupSettings(current, { workingLoadPercent }))} /> : null}
    {!draft.snapshot.stateValues.length ? <Text>This plan needs no starting numbers. Choose loads while you train.</Text> : null}
    {draft.snapshot.stateValues.map((state) => {
      const row = draft.snapshot.sourceRows.find((row) => row.key === state.key)
      const value = suggestionForDraft(draft, state.key)
      const raw = draft.rawValues[state.key] ?? ''
      const edited = draft.manualKeys.includes(state.key)
      const best = row?.bestSet
      const reference = row?.reference === null || row?.reference === undefined ? null : convertWeight(row.reference, draft.snapshot.units, draft.units)
      const derived = state.type !== 'manual' && state.type !== 'five_rep_max'
      const percent = state.type === 'training_max' ? draft.trainingMaxPercent : state.type === 'working_load' ? draft.workingLoadPercent : 100
      return <Panel key={state.key} style={{ padding: spacing.md, gap: spacing.sm }}>
        <Text weight={800}>{state.label ?? getMovementName(state.movementId)}</Text>
        <Caption>{formatStateType(state.type)} · {draft.units}{edited ? ' · Your edit' : ''}</Caption>
        <TextInput value={raw} keyboardType="decimal-pad" editable={!disabled} accessibilityLabel={`${state.label ?? getMovementName(state.movementId)} starting ${draft.units}`}
          error={positiveSetupInput(raw) === null ? raw ? 'Enter a number greater than zero.' : 'Enter a starting number.' : null}
          onChangeText={(next) => update((current) => editSetupValue(current, state.key, next))} testID={`program-state-${state.key}`} />
        <Caption>{row?.source === 'history' && best
          ? `Recorded: ${Math.round(convertWeight(best.load, draft.snapshot.units, draft.units) * 10) / 10} ${draft.units} × ${best.reps} · ${best.date}`
          : row?.source === 'estimate' ? 'From your saved estimated max.' : row?.source === 'saved' ? 'From your matching saved starting value.' : 'No suitable recorded lift or saved estimate. Enter your own starting value.'}</Caption>
        {derived && reference !== null ? <>
          {!advanced ? <Button label="How this suggestion is calculated" variant="subtle" onPress={() => setDetails((current) => current.includes(state.key) ? current.filter((key) => key !== state.key) : [...current, state.key])} /> : null}
          {advanced || details.includes(state.key) ? <Caption>Estimated max {Math.round(reference * 100) / 100} {draft.units} × {percent}% → round to {draft.rounding} {draft.units} → {value ?? 'Enter a value'} {draft.units}. Recorded estimates use logged reps and reps in reserve.</Caption> : null}
        </> : null}
        {value !== null ? <Button label={`Use suggestion · ${value} ${draft.units}`} variant="subtle" disabled={disabled}
          onPress={() => update((current) => applySetupSuggestion(current, state.key))} /> : null}
      </Panel>
    })}
  </>
}

function Percentage({ label, value, min, max, disabled, onChange }: {
  label: string; value: number; min: number; max: number; disabled: boolean; onChange: (value: number) => void
}) {
  return <Panel surface="inset" style={{ padding: spacing.sm, gap: spacing.xs }}>
    <Text>{label} · {value}%</Text>
    <Caption>{min}–{max}% of the recorded or estimated max. Manual edits stay as entered.</Caption>
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <Button label={`Decrease ${label.toLowerCase()}`} variant="default" disabled={disabled || value <= min} onPress={() => onChange(value - 1)} style={{ flex: 1 }} />
      <Button label={`Increase ${label.toLowerCase()}`} variant="default" disabled={disabled || value >= max} onPress={() => onChange(value + 1)} style={{ flex: 1 }} />
    </View>
  </Panel>
}
