import { Calculator, ChevronLeft, ChevronRight, History } from 'lucide-react'
import { Caption, Heading, InfoHint, Text } from '~/components'
import type { MovementSlot, Unit } from '~/shared/types'
import { RolePill, ToolButton } from './LiveSessionControls'
import { formatPreviousShort } from './live-session-utils'

/** Big exercise title flanked by prev/next-exercise chevrons, with plate calculator + history tools. */
export function FocusExerciseHeader({
  movement,
  units,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onOpenHistory,
  onOpenPlates,
}: {
  movement: MovementSlot
  units: Unit
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
  onOpenHistory: () => void
  onOpenPlates: () => void
}) {
  const swapped = movement.performedMovementId && movement.performedMovementId !== movement.movementId
  return (
    <div data-tour="focus-exercise">
      <div className="flex items-center gap-2">
        <ChevronButton dir="prev" disabled={!hasPrev} onClick={onPrev} />
        <div className="min-w-0 flex-1 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <RolePill role={movement.role} />
            <Caption truncate>{movement.targetSummary}</Caption>
          </div>
          <Heading order={1} size="h2" lh={1.1} mt={4} className="truncate">
            {movement.movementName}
          </Heading>
        </div>
        <ChevronButton dir="next" disabled={!hasNext} onClick={onNext} />
      </div>

      {swapped ? (
        <Caption component="p" ta="center" mt={6} fw={700} c="var(--vf-warning-text)">
          Performed as {movement.performedMovementName}
        </Caption>
      ) : null}

      {movement.previous ? (
        <div className="mt-1.5 flex items-center justify-center gap-1">
          <Caption component="span">Last time</Caption>
          <Text component="span" size="xs" fw={700}>
            {formatPreviousShort(movement.previous, units)}
          </Text>
          <InfoHint label="Last session details" width={260}>{movement.previous.label}</InfoHint>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-center gap-2">
        <ToolButton title="Plate math" icon={<Calculator size={13} />} label="Plates" showLabel onClick={onOpenPlates} />
        <ToolButton title="Movement history" icon={<History size={13} />} label="History" showLabel onClick={onOpenHistory} />
      </div>
    </div>
  )
}

function ChevronButton({ dir, disabled, onClick }: { dir: 'prev' | 'next'; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Previous exercise' : 'Next exercise'}
      data-testid={dir === 'prev' ? 'focus-prev-exercise' : 'focus-next-exercise'}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition active:scale-95 disabled:opacity-30"
      style={{
        borderColor: 'var(--mantine-color-default-border)',
        backgroundColor: 'var(--mantine-color-default)',
        color: 'var(--mantine-color-dimmed)',
      }}
    >
      {dir === 'prev' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
    </button>
  )
}
