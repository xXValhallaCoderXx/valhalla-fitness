import { Badge } from '@mantine/core'
import { Caption, Text } from '~/components'
import { cn } from '~/shared/lib/cn'
import type { MovementSwapOption } from '~/shared/types'
import { formatEquipmentLabel } from './live-session-utils'

export function MovementSwapOptionRow({
  option,
  selected,
  onSelect,
}: {
  option: MovementSwapOption
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        'w-full rounded-2xl border p-3 text-left transition',
      )}
      style={{
        borderColor: selected ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-default-border)',
        backgroundColor: selected ? 'var(--vf-action-soft)' : 'var(--vf-surface-2)',
      }}
      onClick={onSelect}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Text component="p" size="sm" fw={900}>
            {option.movementName}
          </Text>
          <Caption component="p" mt={2}>
            {option.relationshipLabel} · {option.category}
          </Caption>
        </div>
        <Badge color="neutral" variant="default">
          {swapOptionSourceLabel(option.source)}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {option.equipment.map((item) => (
          <Badge key={item} color="neutral" variant="default">
            {formatEquipmentLabel(item)}
          </Badge>
        ))}
      </div>
    </button>
  )
}

function swapOptionSourceLabel(source: MovementSwapOption['source']) {
  if (source === 'default') return 'Default'
  return source === 'rule' ? 'Suggested' : 'Related'
}
