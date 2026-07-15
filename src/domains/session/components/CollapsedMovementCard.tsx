import { ChevronDown, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Caption, Text } from '~/components'
import { cn } from '~/shared/lib/cn'
import type { MovementSlot } from '~/shared/types'
import { MovementNumberBadge, RolePill, ToolButton } from './LiveSessionControls'
import { formatPreviousShort, isMovementComplete } from './live-session-utils'

export function CollapsedMovementCard({
  movement,
  movementNumber,
  units,
  onSelect,
  sortHandle,
  onRemoveAdded,
  managementPending,
}: {
  movement: MovementSlot
  movementNumber: number
  units: string
  onSelect: () => void
  sortHandle?: ReactNode
  onRemoveAdded?: () => void
  managementPending: boolean
}) {
  const complete = isMovementComplete(movement)
  const completedSets = movement.sets.filter((set) => set.completed).length
  const totalSets = movement.sets.length

  return (
    <div
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition',
        complete && 'opacity-55',
      )}
      style={{
        borderColor: 'var(--vf-card-border)',
        backgroundColor: 'var(--mantine-color-default)',
        color: 'var(--mantine-color-text)',
        boxShadow: 'var(--vf-shadow-card)',
      }}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
        onClick={onSelect}
      >
        <div className="min-w-0">
          <div className="mb-0.5 flex flex-wrap items-center gap-2">
            <MovementNumberBadge number={movementNumber} complete={complete} />
            <Text component="h3" size="sm" fw={900} truncate className={cn(complete && 'line-through')}>
              {movement.movementName}
            </Text>
            <RolePill role={movement.role} subtle />
          </div>
          <Caption component="p" className="pl-7" size="xs">
            {totalSets} sets · {movement.targetSummary}
            {movement.previous ? (
              <span className="hidden sm:inline"> · last {formatPreviousShort(movement.previous, units)}</span>
            ) : null}
          </Caption>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Caption component="span" fw={700}>
            {completedSets}/{totalSets}
          </Caption>
          <ChevronDown className="-rotate-90" style={{ color: 'var(--mantine-color-dimmed)' }} size={14} />
        </div>
      </button>
      <div className="flex shrink-0 items-center gap-1.5">
        {sortHandle}
        {onRemoveAdded ? (
          <ToolButton
            title="Remove exercise"
            icon={<Trash2 size={13} />}
            label="Remove"
            disabled={managementPending}
            onClick={onRemoveAdded}
          />
        ) : null}
      </div>
    </div>
  )
}
