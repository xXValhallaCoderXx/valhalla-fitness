import { useState } from 'react'
import { View } from 'react-native'
import { ArrowRight } from 'lucide-react-native'
import type { ProgramInstance } from '@sheetless/domain/program/types'
import { Button, Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import { currentEquipmentSwaps } from './equipment-presentation'

export function CurrentEquipmentSwaps({ program }: { program: ProgramInstance }) {
  const { theme } = useTokens()
  const [expanded, setExpanded] = useState(false)
  const swaps = currentEquipmentSwaps(program)
  if (!swaps.length) return null
  return (
    <Panel style={{ padding: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs }}>
        <SectionLabel>Swapped right now</SectionLabel>
        <Caption>{swaps.length} movement{swaps.length === 1 ? '' : 's'}</Caption>
      </View>
      {(expanded ? swaps : swaps.slice(0, 3)).map((swap) => (
        <View key={swap.key} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
          paddingVertical: spacing.xs, borderTopWidth: 1, borderTopColor: theme.border, marginTop: spacing.xs }}>
          <Text size="sm" tone="dimmed" style={{ flex: 1 }}>{swap.sourceName}</Text>
          <ArrowRight size={14} color={theme.textMuted} />
          <Text size="sm" weight={700} align="right" style={{ flex: 1 }}>{swap.replacementName}</Text>
        </View>
      ))}
      {swaps.length > 3 ? <Button variant="subtle" size="sm"
        label={expanded ? 'Show fewer swaps' : `${swaps.length - 3} more swaps`}
        onPress={() => setExpanded((value) => !value)} style={{ paddingHorizontal: 0 }} /> : null}
    </Panel>
  )
}
