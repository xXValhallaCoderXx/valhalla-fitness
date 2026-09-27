import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { router } from 'expo-router'
import type { ProgramOverview } from '@sheetless/domain/program/types'
import { isReturnActive, returnProgressLabel } from '@sheetless/domain/program/return-settings'
import { Button, Caption, Panel, SheetModal, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import { currentEquipmentSwaps } from '../equipment/equipment-presentation'

export function PlanSettingsSheet({ open, onClose, overview, onEquipment, onReturn, onEnd }: {
  open: boolean
  onClose: () => void
  overview: ProgramOverview
  onEquipment: () => void
  onReturn: () => void
  onEnd: () => void
}) {
  const [now] = useState(() => Date.now())
  const program = overview.activeProgram
  if (!program) return null
  const swaps = currentEquipmentSwaps(program)
  const equipment = program.equipmentMode === 'free_weight' ? 'Free weights only' : 'All equipment'
  const activeReturn = isReturnActive(program.returnPeriod)
  const lastCompletedAt = overview.recentSessions[0]?.completedAt
  const daysSinceLast = lastCompletedAt ? Math.floor((now - Date.parse(lastCompletedAt)) / 86_400_000) : 0
  return <SheetModal open={open} onClose={onClose} title="Plan settings" showHandle
    subtitle={`${program.title} only — your app preferences live in Settings.`}
    testID="plan-settings-sheet">
    <View>
      <SettingsRow title="This plan’s equipment"
        description={`${equipment}${swaps.length ? ` · ${swaps.length} movements swapped` : ''}`}
        onPress={onEquipment} />
      <SettingsRow title="Return after a break" onPress={onReturn}
        description={activeReturn && program.returnPeriod ? returnProgressLabel(program.returnPeriod)
          : daysSinceLast >= 14 ? `Not running · last logged workout ${daysSinceLast} days ago`
          : 'Not running · choose a gradual return'} />
      <SettingsRow title="Rounding" description={`Nearest ${program.rounding} ${program.units} · fixed for this plan`} />
    </View>
    <Panel surface="inset" style={{ padding: spacing.sm, gap: spacing.xs }}>
      <Text size="sm" tone="dimmed">Units, rest timer and detail level are app-wide and live in Settings.</Text>
      <Button label="Open Settings ›" variant="subtle" size="sm" style={{ paddingHorizontal: 0 }}
        onPress={() => { onClose(); router.push('/settings') }} />
    </Panel>
    <Button label="Change to a different plan" variant="default" fullWidth
      onPress={() => { onClose(); router.navigate('/templates') }} />
    <Caption>Browse programmes and review a replacement before changing your current plan. Your logged workouts stay in history.</Caption>
    <Button label="End this plan" variant="subtle" tone="danger" onPress={onEnd} />
  </SheetModal>
}

function SettingsRow({ title, description, onPress }: { title: string; description: string; onPress?: () => void }) {
  const { theme } = useTokens()
  const contents = <>
    <View style={{ flex: 1, gap: 2 }}><Text weight={800}>{title}</Text><Caption>{description}</Caption></View>
    {onPress ? <ChevronRight color={theme.textMuted} size={17} /> : null}
  </>
  const style = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.sm,
    paddingVertical: spacing.sm, borderTopColor: theme.border, borderTopWidth: 1, minHeight: 56 }
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={style}>{contents}</Pressable>
    : <View style={style}>{contents}</View>
}
