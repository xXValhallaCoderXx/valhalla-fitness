import { View } from 'react-native'
import { Check } from 'lucide-react-native'
import type { User } from '@supabase/supabase-js'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import { Button, Caption, Text } from '@/components'
import { radii, spacing, useTokens } from '@/lib/tokens'
import { useRestTimerState, type RestReceipt } from '../rest-timer/rest-timer-context'
import { useSetLogMutation } from './useSetLogMutation'

export function LoggedSetReceipt({ user, session, disabled, onSelect }: {
  user: User; session: WorkoutSession; disabled: boolean; onSelect: (movementId: string, setIndex: number) => void
}) {
  const { receipt } = useRestTimerState()
  if (!receipt) return null
  return <Receipt user={user} session={session} disabled={disabled} onSelect={onSelect} receipt={receipt} />
}
function Receipt({ user, session, disabled, onSelect, receipt }: {
  user: User; session: WorkoutSession; disabled: boolean; onSelect: (movementId: string, setIndex: number) => void; receipt: RestReceipt
}) {
  const { theme } = useTokens()
  const movement = session.movements.find(item => item.id === receipt.movementId) ?? session.movements[0]
  const mutation = useSetLogMutation(user, session, movement, receipt.setIndex)
  const set = movement.sets.find(item => item.setIndex === receipt.setIndex)
  if (movement.id !== receipt.movementId || !set?.completed || set.syncState === 'saving' || set.syncState === 'syncFailed') return null
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm,
    paddingVertical: 4, backgroundColor: theme.tones.success.soft, borderColor: theme.tones.success.border, borderWidth: 1, borderRadius: radii.lg }}>
    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: theme.tones.success.soft, alignItems: 'center', justifyContent: 'center' }}>
      <Check size={16} color={theme.tones.success.text} />
    </View>
    <Caption style={{ flex: 1 }}>Set {receipt.setIndex} logged — <Text size="xs" weight={800}>{receipt.load === 0 ? 'Bodyweight' : `${receipt.load ?? '—'} ${session.units}`} × {receipt.reps ?? '—'}</Text></Caption>
    <Button label="Undo" size="sm" variant="subtle" disabled={disabled} onPress={() => {
      onSelect(movement.id, set.setIndex)
      mutation.mutate({ setIndex: set.setIndex, actualLoad: set.actualLoad, actualReps: set.actualReps,
        actualRir: set.actualRir, completed: false })
    }} />
  </View>
}
