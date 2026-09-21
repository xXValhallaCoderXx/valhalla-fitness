import type { MovementSlot } from '@sheetless/domain/session/types/session'
import { SegmentedControl } from '@/components'

export function FocusSetProgressBar({ movement, selectedSetIndex, onSelectSet }: {
  movement: MovementSlot; selectedSetIndex: number; onSelectSet: (setIndex: number) => void
}) {
  return <SegmentedControl accessibilityLabel="Set progress" size="sm"
    variant={movement.sets.length > 4 ? 'pills' : 'segments'} value={String(selectedSetIndex)}
    onChange={value => onSelectSet(Number(value))}
    options={movement.sets.map(set => {
      const status = set.syncState === 'saving' ? 'saving' : set.syncState === 'syncFailed' ? 'save failed' : set.completed ? 'logged' : 'unlogged'
      return { value: String(set.setIndex), label: `${status === 'logged' ? '✓ ' : status === 'save failed' ? '! ' : ''}${set.setIndex === selectedSetIndex ? 'Set ' : ''}${set.setIndex}`,
        tone: status === 'logged' ? 'success' : status === 'save failed' ? 'danger' : undefined,
        accessibilityLabel: `Set ${set.setIndex}, ${status}` }
    })} />
}
