import { Pressable, View } from 'react-native'
import type { PlannedSession } from '@sheetless/domain/session/types'
import type { ProgramInstance } from '@sheetless/domain/program/types'
import { todayLoadProvenance, todayMovementPreview } from '@sheetless/domain/session/today-prescription'
import { buildTodayLedgerRows } from '@sheetless/domain/session/today-numbers'
import { SectionLabel, Text } from '@/components'
import { radii, useTokens } from '@/lib/tokens'

export function WorkoutPreviewTable({ session, program, onOpen }: {
  session: PlannedSession; program?: ProgramInstance | null; onOpen: (id: string) => void
}) {
  const { theme } = useTokens()
  const rows = buildTodayLedgerRows(session, 'full')
  const columns = [{ label: 'Movement', flex: 2.1 }, { label: 'Sets', flex: 0.9 }, { label: `Load ${session.units}`, flex: 1.3 }, { label: 'Target', flex: 1 }]
  return <View>
    <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 7 }}>
      {columns.map(column => <View key={column.label} style={{ flex: column.flex, minWidth: 0 }}><SectionLabel>{column.label}</SectionLabel></View>)}
    </View>
    {session.movements.map((movement, index) => {
      const row = rows[index]
      const preview = todayMovementPreview(movement, session, 'full')
      const provenance = todayLoadProvenance(movement, session, program)
      const set = movement.sets.find(item => item.isTopSet) ?? movement.sets.find(item => !item.isBackoff)
      const target = set?.targetRir != null ? `RIR ${set.targetRir}` : set?.targetRpe != null ? `RPE ${set.targetRpe}` : 'See sets'
      return <Pressable key={movement.id} accessibilityRole="button" accessibilityLabel={`How ${preview.name} is worked out`}
        accessibilityHint={`${preview.loadLabel}. ${preview.prescription}. Opens set targets and calculations.`}
        onPress={() => onOpen(movement.id)} style={{ paddingVertical: 9, gap: 4, minHeight: 44,
          borderBottomWidth: 1, borderBottomColor: theme.border, borderRadius: radii.sm,
          backgroundColor: movement.role === 'main' ? theme.tones.action.soft : undefined }}>
        <View style={{ flexDirection: 'row', gap: 5, alignItems: 'baseline' }}>
          <Text size="sm" weight={700} style={{ flex: 2.1 }}>{preview.name}</Text>
          <Text size="xs" style={{ flex: 0.9 }}>{row.setsLabel}</Text>
          <Text size="xs" weight={800} style={{ flex: 1.3 }}>{preview.loadLabel === '—' ? 'You pick' : preview.loadLabel === 'Bodyweight' ? 'BW' : preview.loadLabel.replace(` ${session.units}`, '')}</Text>
          <Text size="xs" tone="action" style={{ flex: 1 }}>{target}</Text>
        </View>
        {movement.role === 'main' || movement.sets.some(item => item.isBackoff) || (movement.previous && !movement.loadSuggestionCutoff)
          ? <Text size="xs" tone="dimmed">{preview.prescription}</Text> : null}
        {provenance && movement.role === 'main' ? <Text size="xs" tone="action">{provenance} ›</Text> : null}
      </Pressable>
    })}
  </View>
}
