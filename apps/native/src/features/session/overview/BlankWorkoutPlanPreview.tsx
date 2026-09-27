import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { View } from 'react-native'
import { formatSetTarget } from '@sheetless/domain/session/live-session-utils'
import { Button, Caption, Heading, SheetModal, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { todayQueryOptions } from '../queries'

/** A read-only preview: the existing discard confirmation owns the handoff back to Today. */
export function BlankWorkoutPlanPreview({ user, disabled, onClose, onDiscardBlank }: {
  user: User; disabled: boolean; onClose: () => void; onDiscardBlank?: () => void
}) {
  const today = useQuery({ ...todayQueryOptions(user), staleTime: 0, refetchOnMount: 'always' })
  const ready = today.isFetchedAfterMount && !today.isFetching && !today.isError
  const plan = ready ? today.data?.plannedSession : null
  return <SheetModal open showHandle title={plan?.title ?? 'Planned workout'} onClose={onClose}
    subtitle={plan ? `${plan.programTitle} · ${plan.weekLabel}` : undefined}
    footer={<View style={{ gap: spacing.sm }}>
      <Button fullWidth label="Keep blank workout" variant="default" onPress={onClose} />
      {plan && onDiscardBlank ? <Button fullWidth label="Discard blank and return to Today" tone="danger"
        variant="light" disabled={disabled} onPress={onDiscardBlank} /> : null}
    </View>}>
    {today.isError ? <>
      <Text tone="danger">Unable to load your planned workout.</Text>
      <Button label="Retry preview" loading={today.isFetching} onPress={() => void today.refetch()} />
    </> : !ready ? <Text>Checking your planned workout…</Text> : !plan ? <Text>No planned workout is available right now.</Text> : <>
      <Caption>Preview only. To switch, confirm discarding the blank workout, then start from Today.</Caption>
      {plan.movements.map(movement => <View key={movement.id} style={{ gap: spacing.xs }}>
        <Heading order={3}>{movement.performedMovementName ?? movement.movementName}</Heading>
        {movement.sets.map(set => <Text key={set.id} size="sm">
          Set {set.setIndex}: {formatSetTarget(set, plan.units, true, movement)}
        </Text>)}
      </View>)}
    </>}
  </SheetModal>
}
