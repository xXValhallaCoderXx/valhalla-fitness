import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { HistoryBestSet } from '@sheetless/domain/history/types'
import { formatBestSetPrimary } from '@sheetless/domain/history/insight-format'
import { Button, Caption, EmptyState, Panel, SegmentedControl, Text, TextInput } from '@/components'
import { spacing } from '@/lib/tokens'
import { useInsightsState } from '../navigation/InsightsState'
import { MovementHistorySheet } from '../movements/MovementHistorySheet'

export function InsightsRecords({ records, user, onOpenSession }: { records: HistoryBestSet[]; user: User; onOpenSession: (id: string) => void }) {
  const { state, update } = useInsightsState()
  const [selected, setSelected] = useState<HistoryBestSet | null>(null)
  const { query, sort } = state.records
  const visible = records.filter(set => set.movementName.toLowerCase().includes(query.trim().toLowerCase()))
  // The read model already ranks unrounded, unit-normalized estimates and reps.
  if (sort === 'recent') visible.sort((a, b) => (b.performedAt ?? '').localeCompare(a.performedAt ?? ''))
  return <>
    <Caption>One best set per movement in loaded history. Loaded sets rank by estimated strength; bodyweight sets by reps. A first observation is a baseline.</Caption>
    <TextInput value={query} onChangeText={query => update({ records: { ...state.records, query } })}
      accessibilityLabel="Search best sets" placeholder="Search movements" />
    <SegmentedControl options={[{ value: 'recent', label: 'Newest record date' }, { value: 'strength', label: 'Estimated strength / reps' }]}
      value={sort} onChange={sort => update({ records: { ...state.records, sort } })} accessibilityLabel="Best set order" />
    <Caption>{visible.length} of {records.length} movements</Caption>
    {!visible.length ? <EmptyState title="No matching best sets">Complete sets or try another search. Bodyweight work counts too.</EmptyState> : null}
    {visible.map(set => <Panel key={set.id} style={{ gap: spacing.xs, padding: spacing.md }}>
      <Text weight={800}>{set.movementName}</Text>
      <Text size="lg" weight={900}>{formatBestSetPrimary(set)}</Text>
      <Caption>{set.performedAt} · {set.isBaseline ? 'Baseline' : 'Best recorded result'}</Caption>
      {set.e1rm != null ? <Caption>Estimated max {set.e1rm} {set.units}{(set.reps ?? 0) > 12 ? ' · high-rep estimate; outside strength-chart eligibility' : ''}</Caption> : null}
      <Button label="Movement history" variant="subtle" onPress={() => setSelected(set)} />
      <Button label={`Open workout · ${set.sessionTitle}`} variant="subtle" onPress={() => onOpenSession(set.sessionId)} />
    </Panel>)}
    {selected ? <MovementHistorySheet open movementId={selected.movementId} movementName={selected.movementName} user={user} onClose={() => setSelected(null)} /> : null}
  </>
}
