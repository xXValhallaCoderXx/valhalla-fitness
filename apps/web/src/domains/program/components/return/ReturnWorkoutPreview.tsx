import type { PlannedSession } from '@sheetless/domain/session/types'
import { Caption, Panel, SectionLabel, Text } from '~/components'

export function ReturnWorkoutPreview({ sessions }: { sessions: PlannedSession[] }) {
  return (
    <div className="grid gap-2">
      <SectionLabel>Upcoming workouts</SectionLabel>
      <Caption>
        At the proposed weights, before any future accepted increases. Top/plus sets, warmups and
        distinct ramp steps are preserved, so actual set counts can exceed the requested percentage.
      </Caption>
      {sessions.map((session, index) => (
        <details key={`${session.weekIndex}:${index}`} open={index === 0}>
          <summary>
            {index + 1}. {session.title} · {session.weekLabel} ·{' '}
            {session.returnContext?.review
              ? 'Review due'
              : `Stage ${(session.returnContext?.stageIndex ?? 0) + 1}`}
          </summary>
          <Panel surface="inset" p="sm">
            <Caption>{session.phaseLabel}</Caption>
            {session.movements.map((movement) => (
              <div key={movement.id} className="mb-3">
                <Text fw={700}>
                  {movement.movementName} · {movement.sets.length} of{' '}
                  {session.returnContext?.slots[movement.slotId!]?.originalCount ??
                    movement.sets.length}{' '}
                  sets
                </Text>
                {movement.sets.map((set, ordinal) => (
                  <Caption key={set.setIndex}>
                    Set {ordinal + 1}:{' '}
                    {set.targetLoad == null ? 'Choose load' : `${set.targetLoad} ${session.units}`}{' '}
                    ×{' '}
                    {set.targetReps ??
                      `${set.targetRepMin ?? 'chosen'}–${set.targetRepMax ?? 'chosen'}`}
                    {set.isAmrap ? '+' : ''} · {set.targetRir} reps left
                  </Caption>
                ))}
              </div>
            ))}
          </Panel>
        </details>
      ))}
    </div>
  )
}
