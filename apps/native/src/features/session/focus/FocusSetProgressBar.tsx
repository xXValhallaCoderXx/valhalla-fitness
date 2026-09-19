import type { MovementSlot } from '@sheetless/domain/session/types/session'
import { setSegments } from '@sheetless/domain/session/live-focus-utils'
import { SegmentedControl } from '@/components'

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
    <SegmentedControl
      accessibilityLabel="Set progress"
      variant="pills"
      value={String(selectedSetIndex)}
      onChange={(value) => onSelectSet(Number(value))}
      options={segments.map((segment) => ({
        value: String(segment.setIndex),
        label: `Set ${segment.setIndex}${segment.state === 'complete' ? ' ✓' : segment.state === 'failed' ? ' !' : ''}`,
        accessibilityLabel: `Set ${segment.setIndex}, ${segment.state === 'failed' ? 'save failed' : segment.state}`,
      }))}
    />
  )
}
