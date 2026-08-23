import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { buildWorkoutSummary } from '@sheetless/domain/history/workout-summary'
import { Button, Heading, Text } from '@/components'
import { sessionQueryOptions } from '@/features/session/queries'
import { WorkoutSummaryRecap } from '@/features/session/summary/WorkoutSummaryRecap'
import { radii, spacing, useTokens } from '@/lib/tokens'

export function SessionSummarySheet({
  sessionId,
  user,
  onClose,
}: {
  sessionId: string | null
  user: User
  onClose: () => void
}) {
  const { theme } = useTokens()
  const session = useQuery({
    ...sessionQueryOptions(user, sessionId ?? ''),
    enabled: Boolean(sessionId),
  })
  const recap = session.data ? buildWorkoutSummary(session.data) : null

  return (
    <Modal visible={Boolean(sessionId)} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ backgroundColor: 'rgba(6, 12, 14, 0.55)', flex: 1, justifyContent: 'flex-end' }}
      >
        <Pressable onPress={() => {}} style={{ cursor: 'auto' }}>
          <View
            style={{
              backgroundColor: theme.background,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              maxHeight: '92%',
              overflow: 'hidden',
            }}
          >
            <View style={{ borderBottomColor: theme.border, borderBottomWidth: 1, padding: spacing.md }}>
              <Heading order={2}>{session.data?.title ?? 'Workout summary'}</Heading>
            </View>
            <ScrollView contentContainerStyle={{ gap: spacing.md, padding: spacing.md }}>
              {session.isPending ? <Text tone="dimmed">Loading workout summary…</Text> : null}
              {session.isError ? (
                <Text size="sm" tone="danger">
                  {session.error instanceof Error ? session.error.message : 'Unable to load this workout.'}
                </Text>
              ) : null}
              {session.data && recap ? <WorkoutSummaryRecap session={session.data} recap={recap} /> : null}
              <Button label="Close" variant="default" fullWidth onPress={onClose} />
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
