import { View } from 'react-native'
import type { ProgramInstance } from '@sheetless/domain/program/types'
import type { MovementSlot, PlannedSession } from '@sheetless/domain/session/types'
import { buildLoadTrace } from '@sheetless/domain/program/load-trace'
import { formatSetTarget } from '@sheetless/domain/session/live-session-utils'
import { Caption, SectionLabel, SheetModal, Text } from '@/components'
import { spacing } from '@/lib/tokens'

export function WorkoutPrescriptionSheet({ movement, session, program, onClose }: {
  movement: MovementSlot
  session: PlannedSession
  program?: ProgramInstance | null
  onClose: () => void
}) {
  return <SheetModal open title={movement.performedMovementName ?? movement.movementName} onClose={onClose}>
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
  </SheetModal>
}
