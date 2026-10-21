import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { Info } from 'lucide-react-native'
import type { WorkoutSession } from '@sheetless/domain/session/types'
import { workoutEffort, workoutEffortLabel } from '@sheetless/domain/session/today-details'
import { formatNumber } from '@sheetless/domain/shared/set-notation'
import { Button, Caption, Panel, SectionLabel, SheetModal, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function WorkoutEffort({ session, advanced = false, showInfo = advanced }: { session: WorkoutSession; advanced?: boolean; showInfo?: boolean }) {
  const { theme } = useTokens()
  const [open, setOpen] = useState(false)
  const effort = workoutEffort(session)
  const label = effort.rating === null ? 'Effort not recorded' : advanced
    ? `Effort ${effort.rating} of 10`
    : `You called it ${workoutEffortLabel(effort.rating)} — ${effort.rating} out of 10`
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}. How hard it was`}
      onPress={() => setOpen(true)} style={{ minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <Text size="xs" style={{ flex: 1, minWidth: 120 }}>{label}</Text>
      {showInfo ? <Info size={20} color={theme.tones.action.text} /> : null}
    </Pressable>
    {open ? <SheetModal open showHandle title="How hard it was" onClose={() => setOpen(false)}
      footer={<Button label="Got it" fullWidth onPress={() => setOpen(false)} />}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <EffortTile title="You rated it" value={effort.rating === null ? 'Not recorded' : `${effort.rating}/10`} caption="How it felt" />
        <EffortTile title="Reps left" value={effort.averageRir === null ? 'Not recorded' : formatNumber(effort.averageRir)}
          caption={`Average · target ${effort.targetRir === null ? 'not prescribed' : formatNumber(effort.targetRir)}`} />
      </View>
      <EffortComparison session={session} />
      <Caption>Reps left recorded for {effort.recordedSets} of {effort.completedSets} completed sets; targets available for {effort.targetSets}.</Caption>
      <Text size="sm" style={{ lineHeight: 21 }}>{effort.comparison} Progression uses logged sets and the programme’s rules; this overall rating is your reflection.</Text>
    </SheetModal> : null}
  </>
}

function EffortTile({ title, value, caption }: { title: string; value: string; caption: string }) {
  return <Panel surface="inset" style={{ flex: 1, minWidth: 130, padding: spacing.md, gap: 4 }}>
    <SectionLabel>{title}</SectionLabel><Text weight={900} size="xl">{value}</Text><Caption>{caption}</Caption>
  </Panel>
}

function EffortComparison({ session }: { session: WorkoutSession }) {
  const { theme } = useTokens()
  const pairs = session.movements.flatMap(movement => movement.sets).filter(set => set.completed &&
    typeof set.actualRir === 'number' && Number.isFinite(set.actualRir) && set.actualRir >= 0 &&
    typeof set.targetRir === 'number' && Number.isFinite(set.targetRir) && set.targetRir >= 0)
  if (!pairs.length) return <Caption>No paired reps-left values recorded to plot.</Caption>
  const actual = pairs.reduce((sum, set) => sum + set.actualRir!, 0) / pairs.length
  const target = pairs.reduce((sum, set) => sum + set.targetRir!, 0) / pairs.length
  const max = Math.max(4, Math.ceil(actual), Math.ceil(target))
  return <View style={{ gap: spacing.sm }} accessible accessibilityLabel={`Reps left on ${pairs.length} comparable sets: you ${formatNumber(actual)}, plan ${formatNumber(target)}`}>
    <SectionLabel>Reps left · sets with both values</SectionLabel>
    <View style={{ marginHorizontal: 10, height: 30, justifyContent: 'center' }}>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.border }} />
      <View style={{ position: 'absolute', left: `${actual / max * 100}%`, marginLeft: -8, width: 16, height: 16,
        borderRadius: 8, backgroundColor: theme.primaryFill, borderWidth: 2, borderColor: theme.surface }} />
      <View style={{ position: 'absolute', left: `${target / max * 100}%`, width: 2, height: 26, backgroundColor: theme.text }} />
    </View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Caption>0</Caption><Caption>{max}</Caption></View>
    <Caption>You ● {formatNumber(actual)} · Plan | {formatNumber(target)}</Caption>
  </View>
}
