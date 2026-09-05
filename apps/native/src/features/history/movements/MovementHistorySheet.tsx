import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { createAccountClock, describeWorkoutDate } from '@sheetless/domain/shared/dates'
import { describeLift } from '@sheetless/domain/shared/set-notation'
import { Badge, Button, Caption, Heading, Panel, Text } from '@/components'
import { movementHistoryQueryOptions } from '../queries'
import { radii, spacing, useTokens } from '@/lib/tokens'

const HISTORY_LIMIT = 12

export function MovementHistorySheet({
  open,
  movementId,
  movementName,
  user,
  onClose,
}: {
  open: boolean
  movementId: string
  movementName: string
  user: User
  onClose: () => void
}) {
  const { theme } = useTokens()
  const history = useQuery({
    ...movementHistoryQueryOptions(user, movementId),
    enabled: open,
  })
  const entries = history.data?.slice(0, HISTORY_LIMIT) ?? []

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ backgroundColor: 'rgba(6, 12, 14, 0.55)', flex: 1, justifyContent: 'flex-end' }}
      >
        <Pressable onPress={() => {}} style={{ cursor: 'auto' }}>
          <View
            style={{
              backgroundColor: theme.surface,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              gap: spacing.sm,
              maxHeight: '82%',
              padding: spacing.lg,
            }}
          >
            <Heading order={2}>{movementName} history</Heading>
            <Caption>Recent completed logs from any program.</Caption>
            {history.isPending ? <Text tone="dimmed">Loading recent sets…</Text> : null}
            {history.isError ? (
              <View style={{ gap: spacing.xs }}>
                <Text size="sm" tone="danger">
                  {history.error instanceof Error ? history.error.message : 'Unable to load movement history.'}
                </Text>
                <Button label="Retry" variant="default" onPress={() => history.refetch()} />
              </View>
            ) : null}
            {history.isSuccess && entries.length === 0 ? (
              <Text tone="dimmed">No completed sets for this movement yet.</Text>
            ) : null}
            {entries.length ? (
              <ScrollView contentContainerStyle={{ gap: spacing.sm }}>
                {entries.map((entry) => {
                  const clock = createAccountClock({ timeZone: entry.timeZone })
                  const date = describeWorkoutDate({
                    scheduledDate: entry.scheduledDate,
                    completedAt: entry.completedAt,
                    timeZone: entry.timeZone,
                    today: clock.today,
                  })
                  return (
                    <Panel key={entry.id} surface="inset" style={{ gap: 6, padding: spacing.sm }}>
                      <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text size="sm" weight={800} numberOfLines={1}>{entry.sessionTitle}</Text>
                          <Caption>{entry.programTitle ?? 'Training session'} · {entry.targetSummary}</Caption>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Caption>{date.compactDate}</Caption>
                          <Caption>{date.relativeDate}</Caption>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                        {entry.sets.map((set) => (
                          <Badge key={set.id} tone={set.isTopSet || set.isAmrap ? 'accent' : 'neutral'}>
                            {set.setIndex}: {describeLift({
                              load: set.actualLoad,
                              reps: set.actualReps,
                              rir: set.actualRir,
                              units: entry.units,
                              amrap: set.isAmrap,
                            }).compact}
                          </Badge>
                        ))}
                      </View>
                    </Panel>
                  )
                })}
              </ScrollView>
            ) : null}
            <Button label="Close" variant="default" fullWidth onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
