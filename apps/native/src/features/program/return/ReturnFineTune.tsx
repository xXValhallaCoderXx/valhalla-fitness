import { useState } from 'react'
import { View } from 'react-native'
import { Button, Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { ReturnNumberField } from './ReturnNumberField'
import { ReturnSettingsFields } from './ReturnSettingsFields'
import { ReturnWorkoutPreview } from './ReturnWorkoutPreview'
import type { ReturnGuideDraft } from './useReturnGuideDraft'

export function ReturnFineTune({ draft, disabled }: { draft: ReturnGuideDraft; disabled: boolean }) {
  const [otherLoadsOpen, setOtherLoadsOpen] = useState(false)
  const [workoutsOpen, setWorkoutsOpen] = useState(false)
  const references = draft.preview.changes.filter(change => change.kind === 'state')
  const otherLoads = draft.preview.changes.filter(change => change.kind !== 'state')
  const invalidOtherLoad = otherLoads.some(change => change.after === null || change.after < 0 || change.after > 99999)
  const showOtherLoads = otherLoadsOpen || invalidOtherLoad
  return <View style={{ gap: spacing.md }}>
    <Text size="sm">These are starting suggestions, not an estimate of strength you have lost. Your outlook updates with valid changes.</Text>
    {draft.editing ? <Caption>The original reduction is never applied again. These edits use your current weights.</Caption> : null}
    <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
      <SectionLabel>Programme load references · {draft.program.units}</SectionLabel>
      <ReturnLoadFields changes={references} draft={draft} disabled={disabled} />
      <Caption>Historical results and account strength estimates stay separate.</Caption>
      {!references.length ? <Caption>This plan has no automatic load references. Adjust other prescribed loads below, or choose loads while logging.</Caption> : null}
    </Panel>
    <ReturnSettingsFields draft={draft} disabled={disabled} />
    {otherLoads.length ? <>
      <Button fullWidth variant="default" label={`${showOtherLoads ? 'Hide other' : 'Other'} prescribed loads (${otherLoads.length})`}
        disabled={disabled || invalidOtherLoad} onPress={() => setOtherLoadsOpen(!showOtherLoads)} />
      {showOtherLoads ? <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
        <SectionLabel>Other prescribed loads · {draft.program.units}</SectionLabel>
        <Caption>Exact fixed loads and added-accessory targets. A positive load that rounds to zero needs an explicit value.</Caption>
        <ReturnLoadFields changes={otherLoads} draft={draft} disabled={disabled} />
      </Panel> : null}
    </> : null}
    <Button fullWidth variant="default" label={workoutsOpen ? 'Hide exact workout preview' : 'See exact workout preview'}
      disabled={disabled || !draft.valid} onPress={() => setWorkoutsOpen(!workoutsOpen)} />
    {workoutsOpen && draft.valid ? <ReturnWorkoutPreview sessions={draft.preview.upcoming} /> : null}
  </View>
}

function ReturnLoadFields({ changes, draft, disabled }: { changes: ReturnGuideDraft['preview']['changes']; draft: ReturnGuideDraft; disabled: boolean }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
    {changes.map(change => <ReturnNumberField key={`${change.kind}:${change.key}`}
      label={`${change.label.replace(" · programme load reference", "")} · was ${change.before}`} value={draft.loadText(`${change.kind}:${change.key}`, change.after)} disabled={disabled} positive={change.kind === 'state'}
      onChange={value => draft.setLoad(`${change.kind}:${change.key}`, value)} />)}
  </View>
}
