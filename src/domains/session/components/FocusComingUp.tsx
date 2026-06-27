import { ChevronRight } from 'lucide-react'
import { Caption, SectionLabel, Text } from '~/components'
import type { MovementSlot } from '~/shared/types'
import { movementCompletedSets } from './live-focus-utils'
import { MovementNumberBadge } from './LiveSessionControls'
import { isMovementComplete } from './live-session-utils'

/** Peek at the next 1–2 exercises; tapping jumps focus to that exercise. */
export function FocusComingUp({
  movements,
  onJumpTo,
}: {
  movements: MovementSlot[]
  onJumpTo: (movementId: string) => void
}) {
  if (!movements.length) return null
  return (
    <div>
      <SectionLabel className="mb-2">Coming up</SectionLabel>
      <div className="space-y-2">
        {movements.map((movement) => (
          <button
            key={movement.id}
            type="button"
            onClick={() => onJumpTo(movement.id)}
            className="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.99]"
            style={{ borderColor: 'var(--mantine-color-default-border)', backgroundColor: 'var(--mantine-color-default)' }}
          >
            <MovementNumberBadge number={movement.orderIndex + 1} complete={isMovementComplete(movement)} />
            <div className="min-w-0 flex-1">
              <Text size="sm" fw={700} truncate>
                {movement.movementName}
              </Text>
              <Caption truncate>{movement.targetSummary}</Caption>
            </div>
            <Text component="span" size="0.6875rem" fw={700} c="var(--mantine-color-dimmed)" className="tabular-nums">
              {movementCompletedSets(movement)}/{movement.sets.length}
            </Text>
            <ChevronRight size={16} color="var(--mantine-color-dimmed)" />
          </button>
        ))}
      </div>
    </div>
  )
}
