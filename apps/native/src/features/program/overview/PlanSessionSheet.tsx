import { useState } from 'react'
import { Pressable, View } from 'react-native'
import type { ExperienceMode } from '@sheetless/domain/account/types'
import type { ProgramInstance } from '@sheetless/domain/program/types'
import type { ProgramPlanSession } from '@sheetless/domain/program/program-plan'
import { buildLoadTrace } from '@sheetless/domain/program/load-trace'
import { todayMovementPreview, todayLoadProvenance } from '@sheetless/domain/session/today-prescription'
import { buildTodaySessionMeta } from '@sheetless/domain/session/today-numbers'
import { formatSetTarget } from '@sheetless/domain/session/live-session-utils'
import { Button, Caption, SectionLabel, SheetModal, Text } from '@/components'
import { WorkoutMuscles } from '@/features/session/today/WorkoutMuscles'
import { spacing, useTokens } from '@/lib/tokens'

export function PlanSessionSheet({ row, program, mode, onClose, onStart, onResume, onReview,
  activeSessionId, hasActiveSession, pendingCount, busy, error }: {
  row: ProgramPlanSession; program: ProgramInstance; mode: ExperienceMode; onClose: () => void
  onStart: () => void; onResume: () => void; onReview: () => void; activeSessionId?: string | null
  hasActiveSession: boolean; pendingCount: number; busy: boolean; error: string | null
}) {
  const { theme } = useTokens()
  const [movementId, setMovementId] = useState<string | null>(null)
  const session = row.preview
  const movement = session?.movements.find(item => item.id === movementId)
  const next = row.status === 'next'
  const action = activeSessionId ? <Button fullWidth label="Resume workout" onPress={onResume} />
    : hasActiveSession ? <Button fullWidth label="Open Today to resume" onPress={onResume} />
      : pendingCount > 0 ? <Button fullWidth label="Review progression" onPress={onReview} />
        : <Button fullWidth label="Start this workout" loading={busy} disabled={busy} onPress={onStart} />
  return <SheetModal open showHandle title={movement?.movementName ?? row.title} contentKey={movement?.id ?? 'session'}
    eyebrow={movement ? 'Set targets and calculations' : `Session ${row.sessionNumber} · ${next ? 'Next up' : row.status === 'upcoming' ? 'Upcoming' : 'Completed'}`}
    subtitle={!movement && session ? buildTodaySessionMeta(session, 'full').replace('~', 'about ') : undefined}
    onClose={() => movement ? setMovementId(null) : onClose()} closeDisabled={busy}
    footer={movement ? <Button fullWidth label="Back to session" variant="default" onPress={() => setMovementId(null)} />
      : next ? <View style={{ gap: spacing.sm }}>{error ? <Text tone="danger" size="sm">{error}</Text> : null}{action}</View>
        : <Button fullWidth label="Done" onPress={onClose} />}>
    {!session ? <Caption>Saved details are unavailable for this workout. You can browse your workout history from Plan.</Caption>
      : movement ? movement.sets.map(set => {
        const trace = buildLoadTrace({ set, movement, session, program })
        return <View key={set.id} style={{ gap: 5 }}>
          <SectionLabel>Set {set.setIndex}</SectionLabel>
          <Text>{formatSetTarget(set, session.units, true, movement)}</Text>
          {set.targetRir != null ? <Caption>Leave {set.targetRir} reps</Caption> : null}
          {trace ? <><Text size="sm" selectable>{trace.substituted}</Text><Caption>Calculated: {trace.result}</Caption>
            {!trace.matchesPlannedLoad ? <Caption tone="warning">This target includes an adjustment; the calculation does not reproduce the displayed target.</Caption> : null}
          </> : <Caption>No recorded calculation. Choose your load when logging.</Caption>}
        </View>
      }) : <>
        <WorkoutMuscles session={session} advanced={mode === 'full'} />
        <View>{session.movements.map(slot => {
          const display = todayMovementPreview(slot, session, mode)
          const provenance = mode === 'full' ? todayLoadProvenance(slot, session, program) : null
          return <Pressable key={slot.id} accessibilityRole="button" accessibilityLabel={`How ${display.name} is worked out`}
            onPress={() => setMovementId(slot.id)} style={({ pressed }) => ({ gap: 4, paddingVertical: 10,
              borderTopWidth: 1, borderColor: theme.border, minHeight: 44, opacity: pressed ? 0.7 : 1 })}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 4 }}>
              <Text weight={700} style={{ flexShrink: 1 }}>{display.name}</Text><Text weight={700}>{display.loadLabel}</Text>
            </View>
            <Text size="sm" tone="dimmed">{display.prescription}</Text>
            {provenance ? <Text size="xs" tone="action">{provenance} ›</Text> : null}
          </Pressable>
        })}</View>
        <Caption>Preview from current programme weights. Only the next session can start; finished workouts open their recap.</Caption>
      </>}
  </SheetModal>
}
