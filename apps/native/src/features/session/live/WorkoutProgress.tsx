import { useEffect, useState } from 'react'
import { View } from 'react-native'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import { confirmedSetCount } from '@sheetless/domain/session/set-draft'
import { Caption, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function elapsedLabel(startedAt?: string | null, now = Date.now()) {
  const start = startedAt ? Date.parse(startedAt) : NaN
  return Number.isFinite(start) ? `${Math.max(0, Math.floor((now - start) / 60000))} min elapsed` : 'Time unavailable'
}
export function WorkoutProgress({ session }: { session: WorkoutSession }) {
  const { theme } = useTokens()
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id) }, [])
  const count = confirmedSetCount(session)
  const total = session.movements.reduce((sum, movement) => sum + movement.sets.length, 0)
  return <View style={{ gap: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: theme.backgroundElevated }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: spacing.sm, rowGap: 4 }}>
      <Text size="xs" weight={800}>{count} of {total} sets logged</Text>
      <Caption>{elapsedLabel(session.startedAt, now)}</Caption>
    </View>
    <View style={{ backgroundColor: theme.surfaceInset, borderRadius: 4, height: 4 }}>
      <View style={{ height: 4, borderRadius: 4, backgroundColor: theme.primaryFill, width: `${total ? count / total * 100 : 0}%` }} />
    </View>
  </View>
}
