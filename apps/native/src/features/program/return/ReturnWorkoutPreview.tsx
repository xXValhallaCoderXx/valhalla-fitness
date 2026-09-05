import { useState } from 'react'
import { View } from 'react-native'
import type { PlannedSession } from '@sheetless/domain/session/types'
import { Button, Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'

export function ReturnWorkoutPreview({ sessions }: { sessions: PlannedSession[] }) {
  const [expanded, setExpanded] = useState(0)
  return (
    <View style={{ gap: spacing.sm }}>
      <SectionLabel>Upcoming workouts</SectionLabel>
      <Caption>
        At the proposed weights, before future accepted increases. Essential sets remain, so actual
        counts can exceed the requested percentage.
      </Caption>
      {sessions.map((session, index) => (
        <Panel
          key={`${session.weekIndex}:${index}`}
          surface="inset"
          style={{ padding: spacing.sm, gap: spacing.sm }}
        >
          <Button
            variant="subtle"
            label={`${index + 1}. ${session.title} · ${session.weekLabel}`}
            onPress={() => setExpanded(expanded === index ? -1 : index)}
          />
          <Caption>
            {session.phaseLabel} ·{' '}
            {session.returnContext?.review
              ? 'Review due'
              : `Stage ${(session.returnContext?.stageIndex ?? 0) + 1}`}
          </Caption>
          {expanded === index
            ? session.movements.map((movement) => (
                <View key={movement.id} style={{ gap: 4 }}>
                  <Text weight={700}>
                    {movement.movementName} · {movement.sets.length} of{' '}
                    {session.returnContext?.slots[movement.slotId!]?.originalCount ??
                      movement.sets.length}{' '}
                    sets
                  </Text>
                  {movement.sets.map((set, ordinal) => (
                    <Caption key={set.setIndex}>
                      Set {ordinal + 1}:{' '}
                      {set.targetLoad == null
                        ? 'Choose load'
                        : `${set.targetLoad} ${session.units}`}{' '}
                      ×{' '}
                      {set.targetReps ??
                        `${set.targetRepMin ?? 'chosen'}–${set.targetRepMax ?? 'chosen'}`}
                      {set.isAmrap ? '+' : ''} · {set.targetRir} reps left
                    </Caption>
                  ))}
                </View>
              ))
            : null}
        </Panel>
      ))}
    </View>
  )
}
