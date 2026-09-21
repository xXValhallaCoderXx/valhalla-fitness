import { useState } from 'react'
import { Pressable, View } from 'react-native'
import type { ExperienceMode } from '@sheetless/domain/account/types'
import type { ProgramInstance } from '@sheetless/domain/program/types'
import type { PlannedSession } from '@sheetless/domain/session/types'
import { todayLoadProvenance, todayMovementPreview } from '@sheetless/domain/session/today-prescription'
import { buildLoadTrace } from '@sheetless/domain/program/load-trace'
import { formatSetTarget } from '@sheetless/domain/session/live-session-utils'
import { Caption, SectionLabel, SheetModal, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function WorkoutPreview({ session, program, mode = 'guided' }: {
  session: PlannedSession
  program?: ProgramInstance | null
  mode?: ExperienceMode
}) {
  const { theme } = useTokens()
  const [expanded, setExpanded] = useState(false)
  const [details, setDetails] = useState<string | null>(null)
  const limit = mode === 'full' ? 4 : 5
  const shown = expanded ? session.movements : session.movements.slice(0, limit)
  const remaining = session.movements.length - limit
  const movement = session.movements.find((item) => item.id === details)
  return <>
    <View>
      {shown.map((slot) => {
        const row = todayMovementPreview(slot, session, mode)
        const provenance = mode === 'full' ? todayLoadProvenance(slot, session, program) : null
        return <Pressable key={slot.id} accessibilityRole="button"
          accessibilityLabel={`How ${row.name} is worked out`}
          accessibilityHint={`${row.loadLabel === '—' ? '' : `${row.loadLabel}. `}${row.prescription}. Opens set targets and calculations.`}
          onPress={() => setDetails(slot.id)} style={({ pressed }) => ({
            borderTopWidth: 1, borderTopColor: theme.border, paddingVertical: 7, gap: 2,
            minHeight: 44, opacity: pressed ? 0.7 : 1,
          })}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text weight={700} style={{ flexGrow: 1, flexShrink: 1 }}>{row.name}</Text>
            {mode === 'full' ? <Text weight={700}>{row.loadLabel}</Text> : null}
          </View>
          <Text size="xs" tone="dimmed">{row.prescription}</Text>
          {provenance ? <Text size="xs" tone="action" weight={600}>{provenance} ›</Text> : null}
        </Pressable>
      })}
    </View>
    {remaining > 0 ? <Pressable accessibilityRole="button" accessibilityState={{ expanded }}
      onPress={() => setExpanded(!expanded)} testID="today-expand-preview" style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text size="sm" weight={700} tone="action">{expanded ? 'Show fewer movements' : `${remaining} more ${remaining === 1 ? 'movement' : 'movements'}`}</Text>
    </Pressable> : null}
    {movement ? <SheetModal open title={movement.performedMovementName ?? movement.movementName} onClose={() => setDetails(null)}>
      {movement.sets.map((set) => {
        const trace = buildLoadTrace({ set, movement, session, program })
        return <View key={set.setIndex} style={{ gap: spacing.xs }}>
          <SectionLabel>Set {set.setIndex}</SectionLabel>
          <Text>{formatSetTarget(set, session.units, true, movement)}</Text>
          {set.targetRir != null ? <Caption>Leave {set.targetRir} reps (RIR {set.targetRir})</Caption> : null}
          {set.targetRpe != null ? <Caption>Target effort {set.targetRpe} of 10</Caption> : null}
          {trace ? <>
            {trace.inputs.map((input) => <Caption key={input.label}>{input.label}: {input.value}{input.provenance ? ` · ${input.provenance}` : ''}</Caption>)}
            <Text size="sm" selectable>{trace.substituted}</Text>
            {trace.evaluated ? <Caption>{trace.evaluated}</Caption> : null}
            <Text size="sm">Calculated: {trace.result}</Text>
            {!trace.matchesPlannedLoad ? <Text tone="warning" size="sm">Your current target includes an adjustment. The calculation above does not reproduce the displayed target.</Text> : null}
          </> : <Caption>No recorded calculation for this target. Confirm your own load when logging.</Caption>}
        </View>
      })}
    </SheetModal> : null}
  </>
}
