import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { describeLift, formatWeight } from '@sheetless/domain/shared/set-notation'
import { convertWeight } from '@sheetless/domain/shared/math'
import { formatCompactDate } from '@sheetless/domain/shared/dates'
import { Button, Caption, LineChart, Panel, SheetModal, Text } from '@/components'
import { useMe } from '@/lib/account'
import { spacing } from '@/lib/tokens'
import { movementHistoryQueryOptions } from '../queries'
import { SessionSummarySheet } from '../sessions/SessionSummarySheet'

type Props = { open: boolean; movementId: string; movementName: string; user: User; onClose: () => void }

export function MovementHistorySheet(props: Props) {
  return props.open ? <MovementHistoryContent key={`${props.user.id}:${props.movementId}`} {...props} /> : null
}

function MovementHistoryContent({ movementId, movementName, user, onClose }: Props) {
  const history = useQuery(movementHistoryQueryOptions(user, movementId))
  const me = useMe()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const units = me.data?.units ?? 'kg'
  const entries = history.data ?? []
  const points = [...entries].reverse().map(entry => {
    const estimates = entry.sets.filter(set => set.actualReps && set.actualReps <= 12 && set.assessment?.estimateKg != null)
    const clean = estimates.filter(set => !set.assessment?.unusual)
    const candidates = clean.length ? clean : estimates
    const best = candidates.reduce<(typeof candidates)[number] | null>((best, set) =>
      !best || set.assessment!.estimateKg! > best.assessment!.estimateKg! ? set : best, null)
    return { date: entry.scheduledDate, x: Date.parse(entry.scheduledDate), label: formatCompactDate(entry.scheduledDate),
      sessionId: entry.sessionId, value: best ? convertWeight(best.assessment!.estimateKg!, 'kg', units) : null,
      unusual: Boolean(best?.assessment?.unusual) }
  })
  return <>
    <SheetModal open={!sessionId} title={movementName} eyebrow="Movement history" onClose={onClose} showHandle
      subtitle="Latest 12 completed movement entries, across your programmes."
      footer={<Button label="Done" variant="default" onPress={onClose} />}>
      {history.isPending ? <Text tone="dimmed">Loading recorded sets…</Text> : null}
      {history.isError ? <>
        <Text tone="danger">{history.error instanceof Error ? history.error.message : 'Movement history could not load.'}</Text>
        <Button label="Retry movement history" onPress={() => void history.refetch()} />
      </> : null}
      {history.isSuccess && !entries.length ? <Text>No completed sets for this movement yet.</Text> : null}
      {points.some(point => point.value !== null) ? <>
        <LineChart inspectable showPoints
          points={points.map(point => ({ ...point, value: point.unusual ? null : point.value }))}
          markers={points.map(point => ({ ...point, value: point.unusual ? point.value : null }))}
          onOpenPoint={index => setSessionId(points[index].sessionId)}
          formatValue={value => formatWeight(value, units) ?? '—'} accessibilityLabel={`${movementName} recorded estimates`}
          emptyMessage="No supported estimates in these entries." />
        <Caption>Estimates use loaded sets of 1–12 reps. Hollow points are unusual and excluded from strength estimates. Original sets below keep their recorded units.</Caption>
      </> : null}
      {entries.map(entry => <Panel key={entry.id} surface="inset" style={{ padding: spacing.md, gap: spacing.sm }}>
        <Text weight={800}>{entry.sessionTitle}</Text>
        <Caption>{entry.scheduledDate} · {entry.programTitle ?? 'Workout'}</Caption>
        {entry.unitsInferred ? <Caption>The original unit was missing. Using the newest explicit historical unit ({entry.units}), or kg when none was recorded.</Caption> : null}
        {entry.sets.map(set => <Panel key={set.id} style={{ padding: spacing.sm, gap: spacing.xs }}>
          <Text size="sm">Set {set.setIndex}: {describeLift({ load: set.actualLoad, reps: set.actualReps, rir: set.actualRir, units: entry.units, amrap: set.isAmrap }).compact}</Text>
          {set.assessment?.unusual ? <Caption tone="warning">Unusual estimate: {formatWeight(convertWeight(set.assessment.estimateKg!, 'kg', entry.units ?? 'kg'), entry.units)}. Above this workout’s threshold of {formatWeight(convertWeight(set.assessment.thresholdKg!, 'kg', entry.units ?? 'kg'), entry.units)}. Kept in your log; excluded from estimated best sets and strength calculations.</Caption>
            : set.assessment?.estimateKg != null ? <Caption>Estimated max {formatWeight(convertWeight(set.assessment.estimateKg, 'kg', units), units)}{(set.actualReps ?? 0) > 12 ? ' · high-rep estimate, outside strength-chart eligibility' : ''}.</Caption> : null}
          {!set.assessment ? <Caption>Outside the assessed analytics window or missing eligible inputs; original log shown.</Caption> : null}
        </Panel>)}
        <Button label="Open source workout" variant="subtle" onPress={() => setSessionId(entry.sessionId)} />
      </Panel>)}
      <Caption>Showing {entries.length} of up to 12 recent entries. Unusual-value assessment uses the loaded analytics window of up to 240 workouts. Older logs remain available through their workout recaps.</Caption>
    </SheetModal>
    <SessionSummarySheet sessionId={sessionId} user={user} onClose={() => setSessionId(null)} />
  </>
}
