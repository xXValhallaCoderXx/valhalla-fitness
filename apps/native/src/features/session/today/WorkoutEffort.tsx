import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { Info } from 'lucide-react-native'
import type { WorkoutSession } from '@sheetless/domain/session/types'
import { workoutEffort, workoutEffortLabel } from '@sheetless/domain/session/today-details'
import { formatNumber } from '@sheetless/domain/shared/set-notation'
import { Button, Caption, SheetModal, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

function EffortBar({ rating, large = false }: { rating: number | null; large?: boolean }) {
  const { theme } = useTokens()
  return <View accessible={false} style={{ flexDirection: 'row', gap: large ? 4 : 3 }}>
    {Array.from({ length: 10 }, (_, index) => <View key={index} style={{
      width: large ? 16 : 11, height: large ? 12 : 8, borderRadius: 2,
      backgroundColor: rating !== null && index < rating ? theme.primaryFill : theme.border,
    }} />)}
  </View>
}

export function WorkoutEffort({ session, advanced = false, showInfo = advanced }: { session: WorkoutSession; advanced?: boolean; showInfo?: boolean }) {
  const { theme } = useTokens()
  const [open, setOpen] = useState(false)
  const effort = workoutEffort(session)
  const label = effort.rating === null ? 'Effort not recorded' : advanced
    ? `Effort ${effort.rating} of 10`
    : `You called it ${workoutEffortLabel(effort.rating)} — ${effort.rating} out of 10`
  const rows = [
    ['What you rated it', effort.rating === null ? 'Not recorded' : `${effort.rating} of 10`],
    ['Reps you had left, on average', effort.averageRir === null ? 'Not recorded' : formatNumber(effort.averageRir)],
    ['What the plan asked for', effort.targetRir === null ? 'Not prescribed' : formatNumber(effort.targetRir)],
  ]
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}. How hard it was`}
      onPress={() => setOpen(true)} style={{ minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <EffortBar rating={effort.rating} />
      <Text size="xs" style={{ flex: 1, minWidth: 120 }}>{label}</Text>
      {showInfo ? <Info size={20} color={theme.tones.action.text} /> : null}
    </Pressable>
    {open ? <SheetModal open title="How hard it was" onClose={() => setOpen(false)}
      footer={<Button label="Got it" fullWidth onPress={() => setOpen(false)} />}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
        <EffortBar rating={effort.rating} large />
        <Text weight={700}>{effort.rating === null ? 'Not recorded' : `${effort.rating} of 10`}</Text>
      </View>
      <View>{rows.map(([title, value]) => <View key={title} style={{
        flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, paddingVertical: 10,
        borderTopWidth: 1, borderColor: theme.border,
      }}>
        <Text style={{ flex: 1 }}>{title}</Text><Text weight={700} style={{ flexShrink: 1 }}>{value}</Text>
      </View>)}</View>
      <Caption>Reps left recorded for {effort.recordedSets} of {effort.completedSets} completed sets; targets available for {effort.targetSets}.</Caption>
      <Text size="sm" style={{ lineHeight: 21 }}>{effort.comparison} Progression uses logged sets and the programme’s rules; this overall rating is your reflection.</Text>
    </SheetModal> : null}
  </>
}
