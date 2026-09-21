import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { ChevronDown, ChevronRight } from 'lucide-react-native'
import { Button, Caption, SectionLabel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import type { NativeWorkoutRecap } from './native-workout-recap'

export function RecapMovements({ recap, advanced }: { recap: NativeWorkoutRecap; advanced: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const limit = advanced ? 2 : 3
  const visible = expanded ? recap.exercises : recap.exercises.slice(0, limit)
  if (!recap.exercises.length) return null
  return <View style={{ gap: spacing.xs }}>
    <SectionLabel>{advanced ? 'Planned vs logged' : 'What you did'}</SectionLabel>
    {visible.map(exercise => <MovementResult key={exercise.id} exercise={exercise} advanced={advanced} />)}
    {recap.exercises.length > limit ? <Button variant="subtle" fullWidth
      label={expanded ? 'Show fewer movements' : `${recap.exercises.length - limit} more movements`}
      onPress={() => setExpanded(!expanded)} /> : null}
  </View>
}

function MovementResult({ exercise, advanced }: { exercise: NativeWorkoutRecap['exercises'][number]; advanced: boolean }) {
  const { theme } = useTokens()
  const [open, setOpen] = useState(false)
  const Icon = open ? ChevronDown : ChevronRight
  return <View style={{ borderTopWidth: 1, borderColor: theme.border, paddingVertical: spacing.xs, gap: spacing.xs }}>
    <Pressable onPress={() => setOpen(!open)} accessibilityRole="button"
      accessibilityLabel={`${open ? 'Hide' : 'Show'} ${exercise.name} sets`} accessibilityState={{ expanded: open }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44 }}>
      <Text size="sm" weight={700} style={{ flex: 1 }}>{exercise.name}</Text>
      <Caption>{advanced ? `${exercise.completedSetCount}/${exercise.plannedSetCount}` : `${exercise.completedSetCount} of ${exercise.plannedSetCount} sets`}</Caption>
      <Icon size={16} color={theme.textMuted} />
    </Pressable>
    {advanced || open ? <Caption>Planned {exercise.targetSummary}</Caption> : null}
    {exercise.originalName ? <Caption>Performed instead of {exercise.originalName}.</Caption> : null}
    {advanced && !open ? <Caption>Logged {exercise.sets.map(set => set.resultLabel).join(' · ')}</Caption> : null}
    {open ? exercise.sets.map(set => <Text key={set.id} size="sm">
      Set {set.index} · {set.resultLabel}{set.rir === null ? '' : advanced ? ` · RIR ${set.rir}` : ` · ${set.rir} reps left`}
    </Text>) : null}
  </View>
}
