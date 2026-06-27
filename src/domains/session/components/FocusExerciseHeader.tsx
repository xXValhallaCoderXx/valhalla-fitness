import { Calculator, ChevronLeft, ChevronRight, History } from 'lucide-react'
import { Caption, Heading } from '~/components'
import type { MovementSlot } from '~/shared/types'
import { RolePill, ToolButton } from './LiveSessionControls'

/** Big exercise title flanked by prev/next-exercise chevrons, with plate (placeholder) + history tools. */
export function FocusExerciseHeader({
  movement,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onOpenHistory,
}: {
  movement: MovementSlot
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
  onOpenHistory: () => void
}) {
  const swapped = movement.performedMovementId && movement.performedMovementId !== movement.movementId
  return (
    <div>
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

      <div className="mt-3 flex items-center justify-center gap-2">
        <ToolButton title="Plate math (coming soon)" icon={<Calculator size={13} />} label="Plates" disabled />
        <ToolButton title="Movement history" icon={<History size={13} />} label="History" onClick={onOpenHistory} />
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
