import { Pressable, View } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import type { ProgramOverview } from '@sheetless/domain/program/types'
import { Caption, Text } from '@/components'
import { radii, spacing, useTokens } from '@/lib/tokens'

export function ActiveProgramBand({ name, position, onOpen }: {
  name: string
  position?: ProgramOverview['position']
  onOpen: () => void
}) {
  const { theme } = useTokens()
  return <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open current plan: ${name}`}
    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      backgroundColor: theme.surface, borderRadius: radii.lg, padding: spacing.md, opacity: pressed ? 0.7 : 1 })}>
    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: theme.primaryFill }} />
    <View style={{ flex: 1, gap: 2 }}>
      <Text size="sm" weight={800}>Running {name}</Text>
      {position ? <Caption>Week {position.weekNumber} of {position.totalWeeks} · {position.phaseLabel}</Caption> : null}
    </View>
    <ChevronRight size={18} color={theme.textMuted} />
  </Pressable>
}
