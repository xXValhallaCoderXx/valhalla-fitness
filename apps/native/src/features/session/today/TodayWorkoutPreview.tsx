import { useState } from 'react'
import { Pressable, View } from 'react-native'
import type { ProgramInstance } from '@sheetless/domain/program/types'
import { buildLoadTrace, definingSet } from '@sheetless/domain/program/load-trace'
import type { PlannedSession } from '@sheetless/domain/session/types'
import { buildTodayLedgerRows } from '@sheetless/domain/session/today-numbers'
import { Caption, Text } from '@/components'
import { useExperienceMode } from '@/lib/experience-mode'
import { spacing, useTokens } from '@/lib/tokens'

const PREVIEW_LIMIT = 3

export function TodayWorkoutPreview({ session, program, reasonByStateKey }: {
  session: PlannedSession
  program?: ProgramInstance | null
  reasonByStateKey?: Record<string, string>
}) {
  const { theme } = useTokens()
  const { mode, isFull, showFormulas } = useExperienceMode()
  const [expanded, setExpanded] = useState(false)
  const rows = buildTodayLedgerRows(session, { mode, reasonByStateKey })
  const visible = expanded ? rows : rows.slice(0, PREVIEW_LIMIT)
  const hiddenCount = Math.max(0, rows.length - PREVIEW_LIMIT)

  return (
    <View>
      {visible.map((row) => {
        const movement = session.movements.find((item) => item.id === row.slotId)
        const set = showFormulas && movement ? definingSet(movement) : null
        const trace = set && movement ? buildLoadTrace({ set, movement, session, program }) : null
        return (
          <View key={row.slotId} style={{ borderTopWidth: 1, borderTopColor: theme.border, gap: spacing.xs, paddingVertical: spacing.sm }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: spacing.xs }}>
              <Text weight={700} style={{ flexGrow: 1, flexShrink: 1 }}>{row.movementName}</Text>
              <Text size="sm" weight={700} style={{ fontVariant: ['tabular-nums'] }}>{row.loadsLabel}</Text>
            </View>
            <Text size="sm" tone="dimmed">{row.prescriptionLabel}</Text>
            {row.reason ? <Caption>{row.reason}</Caption> : null}
            {isFull && row.historyLine ? <Caption>Last time · {row.historyLine}</Caption> : null}
            {trace?.matchesPlannedLoad ? (
              <Text size="xs" tone="action" selectable style={{ backgroundColor: theme.tones.action.soft, padding: spacing.xs, borderRadius: 4 }}>
                {trace.expression} → {trace.result}
              </Text>
            ) : null}
            {trace && !trace.matchesPlannedLoad ? <Caption>Adjusted target · the saved prescription takes precedence.</Caption> : null}
          </View>
        )
      })}
      {hiddenCount > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          aria-expanded={expanded}
          onPress={() => setExpanded((current) => !current)}
          testID="today-workout-preview-toggle"
          style={({ pressed }) => ({ borderTopWidth: 1, borderTopColor: theme.border, justifyContent: 'center', minHeight: 48, opacity: pressed ? 0.7 : 1 })}
        >
          <Text size="sm" tone="action" weight={700}>
            {expanded ? 'Show fewer movements' : `See all ${rows.length} movements · ${hiddenCount} more`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}
