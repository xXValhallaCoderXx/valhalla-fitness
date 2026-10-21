import { View } from 'react-native'
import { Button, Caption, Panel, SectionLabel } from '@/components'
import { spacing } from '@/lib/tokens'
import { ReturnNumberField } from './ReturnNumberField'
import type { ReturnGuideDraft } from './useReturnGuideDraft'

export function ReturnSettingsFields({ draft, disabled }: { draft: ReturnGuideDraft; disabled: boolean }) {
  const { program, raw, preview } = draft
  const movements = [...new Map(preview.upcoming.flatMap(session =>
    session.movements.map(movement => [movement.slotId!, movement] as const))).values()]
  return <>
    <Panel style={{ padding: spacing.md, gap: spacing.md }}>
      <SectionLabel>{raw.stages.length === 2 ? 'The two stages' : 'Return stages'}</SectionLabel>
      {raw.stages.map((stage, index) => <View key={index} style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <ReturnNumberField label={`Stage ${index + 1} · workouts`} value={stage.workouts} disabled={disabled} minimum={1} maximum={100} integer
            onChange={workouts => draft.updateStage(index, { workouts })} />
          <ReturnNumberField label={`Stage ${index + 1} · share of sets`} suffix="%" value={stage.percentage} disabled={disabled} maximum={100}
            onChange={percentage => draft.updateStage(index, { percentage })} />
        </View>
        {draft.individual ? movements.map(movement => <ReturnNumberField key={movement.slotId}
          label={`Stage ${index + 1} · ${movement.movementName} sets`} value={stage.counts[movement.slotId!] ?? ''} disabled={disabled} minimum={1} maximum={100} integer optional
          onChange={value => draft.updateStage(index, { counts: { ...stage.counts, [movement.slotId!]: value } })} />) : null}
      </View>)}
      <Caption>Warmups, top sets and distinct prescriptions stay. Duplicate sets are reduced first, so actual counts can be higher.</Caption>
      {draft.individual ? <Caption>Leave individual counts blank to use the stage percentage.</Caption> : null}
      {draft.editing && raw.stages.length < 8 ? <Button variant="default" label="Add another rotation" disabled={disabled} onPress={draft.addStage} /> : null}
    </Panel>
    <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
      <SectionLabel>How hard to go</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <ReturnNumberField label="Leave at least · reps" suffix="RIR" value={raw.minimumRir} disabled={disabled} minimum={3} maximum={10}
          onChange={value => draft.setField('minimumRir', value)} />
        <ReturnNumberField label="Maximum suggested increase" suffix={program.units} value={raw.defaultCap} disabled={disabled} maximum={100}
          onChange={value => draft.setField('defaultCap', value)} />
      </View>
      <Caption>Leave 3–10 reps in reserve. The cap applies per eligible programme-reference increase; zero holds increases. Training-max changes reach your sets through their prescribed percentages.</Caption>
      {draft.individual ? preview.changes.filter(change => change.kind === 'state').map(change =>
        <ReturnNumberField key={change.key} label={`${change.label} cap`} suffix={program.units}
          value={raw.caps[change.key] ?? ''} disabled={disabled} maximum={100} optional onChange={value => draft.setCap(change.key, value)} />) : null}
      {draft.individual ? <Caption>Leave an individual cap blank to use the default.</Caption> : null}
    </Panel>
    <Button variant="subtle" label={draft.individual ? 'Hide individual set counts and caps' : 'Adjust individual set counts and caps'}
      disabled={disabled} onPress={() => draft.setIndividual(!draft.individual)} />
  </>
}
