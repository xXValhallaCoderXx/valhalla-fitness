import { View } from 'react-native'
import type { ProgramOverview, ProgramStateOverview } from '@sheetless/domain/program/types'
import type { ProgramPlan } from '@sheetless/domain/program/program-plan'
import { buildLoadTrace } from '@sheetless/domain/program/load-trace'
import { formatNumber } from '@sheetless/domain/shared/set-notation'
import { Button, Caption, Panel, SectionLabel, SheetModal, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function WorkingWeightSheet({ state, overview, plan, onClose }: {
  state: ProgramStateOverview; overview: ProgramOverview; plan: ProgramPlan; onClose: () => void
}) {
  const { theme } = useTokens()
  const program = overview.activeProgram!
  const decisions = overview.acceptedDecisions.filter(decision => decision.stateKey === state.stateKey)
  const changes = [
    ...decisions.map(decision => ({ id: decision.id, date: decision.resolvedAt, before: decision.previousValue,
      after: decision.recommendedValue, description: decision.rationale ?? decision.recommendation, reset: false })),
    ...(program.loadAdjustments ?? []).flatMap((adjustment, index) => adjustment.changes
      .filter(change => change.kind === 'state' && change.key === state.stateKey)
      .map(change => ({ id: `reset-${index}`, date: adjustment.createdAt, before: change.before, after: change.after,
        description: 'Explicit return-guide adjustment. Recorded separately from earned progression.', reset: true }))),
  ].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  const sample = plan.weeks.flatMap(week => week.sessions).flatMap(row => row.preview ? row.preview.movements
    .flatMap(movement => movement.sets.filter(set => set.sourceBinding?.stateKey === state.stateKey)
      .map(set => ({ session: row.preview!, movement, set }))) : [])
    .sort((a, b) => (b.set.targetLoad ?? -1) - (a.set.targetLoad ?? -1))[0]
  const trace = sample ? buildLoadTrace({ ...sample, program }) : null
  const typeLabel = state.stateType.replaceAll('_', ' ')
  return <SheetModal open showHandle title={state.movementName} eyebrow={`Working weight · ${typeLabel}`} onClose={onClose}
    footer={<Button fullWidth label="Done" onPress={onClose} />}>
    <Text weight={900} style={{ fontSize: 34 }}>{formatNumber(state.value)} {state.units}</Text>
    <Panel surface="inset" style={{ padding: spacing.md, gap: spacing.sm }}>
      <Text size="sm">{state.stateType === 'training_max'
        ? 'Your training max is a programme reference. Prescribed percentages and rounding turn it into workout weights.'
        : 'This is a programme load reference. Each prescription determines how it sets your workout weights.'}</Text>
      {trace && sample ? <>
        <Caption>Upcoming example · {sample.session.weekLabel} · {sample.movement.movementName}</Caption>
        <Text size="sm" selectable>{trace.substituted} = {trace.result}</Text>
        {!trace.matchesPlannedLoad ? <Caption tone="warning">This target includes an adjustment. The calculation above does not reproduce the displayed target of {sample.set.targetLoad ?? '—'} {state.units}.</Caption> : null}
      </> : <Caption>No upcoming numeric calculation is available for this reference.</Caption>}
    </Panel>
    <SectionLabel>What moved it</SectionLabel>
    {changes.map(change => <View key={change.id} style={{ borderTopWidth: 1, borderColor: theme.border, paddingTop: spacing.sm, gap: 4 }}>
      <Text weight={700}>{change.before == null ? '—' : formatNumber(change.before)} → {change.after == null ? '—' : formatNumber(change.after)} {state.units}</Text>
      <Caption>{change.date ? change.date.slice(0, 10) : 'Date unavailable'} · {change.reset ? 'Explicit reset' : change.after === change.before ? 'Held' : (change.after ?? 0) > (change.before ?? 0) ? 'Applied increase' : 'Applied reduction'}</Caption>
      <Text size="sm">{change.description}</Text>
    </View>)}
    {!changes.length ? <Caption>No recorded changes to this reference yet.</Caption> : null}
    {state.pendingDecision ? <Caption tone="warning">A proposed change is awaiting review. It has not changed this value.</Caption> : null}
    <Caption>Workout results and your profile’s strength estimates are separate from this programme reference.</Caption>
  </SheetModal>
}
