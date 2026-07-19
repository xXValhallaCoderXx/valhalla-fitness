import type { MovementSlot } from '~/shared/types'
import { setSegments, type SetSegmentState } from './live-focus-utils'

/** Tappable segmented per-exercise set progress. One segment per set; tap to revisit/edit a set. */
export function FocusSetProgressBar({
  movement,
  selectedSetIndex,
  onSelectSet,
}: {
  movement: MovementSlot
  selectedSetIndex: number
  onSelectSet: (setIndex: number) => void
}) {
  const segments = setSegments(movement, selectedSetIndex)
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Set progress">
      {segments.map((segment) => (
        <button
          key={segment.setIndex}
          type="button"
          aria-label={`Set ${segment.setIndex}`}
          aria-current={segment.state === 'current'}
          onClick={() => onSelectSet(segment.setIndex)}
          className="flex-1 py-2"
        >
          <span className="block h-2 rounded-full transition" style={{ backgroundColor: segmentColor(segment.state) }} />
        </button>
      ))}
    </div>
  )
}

function segmentColor(state: SetSegmentState): string {
  switch (state) {
    case 'complete':
      return 'var(--mantine-primary-color-filled)'
    case 'current':
      return 'var(--vf-action-border)'
    case 'failed':
      return 'var(--vf-danger-text)'
    default:
      return 'var(--vf-surface-3)'
  }
}
