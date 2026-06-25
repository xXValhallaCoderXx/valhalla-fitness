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
        'w-full rounded-xl border p-3 text-left transition',
        selected
          ? 'border-[var(--mantine-primary-color-filled)] bg-[var(--vf-action-soft)]'
          : 'border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] hover:border-[var(--vf-action-border)]',
      )}
      onClick={onSelect}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-[var(--mantine-color-text)]">{option.movementName}</p>
          <p className="mt-0.5 text-xs text-[var(--mantine-color-dimmed)]">
            {option.relationshipLabel} · {option.category}
          </p>
        </div>
        <span className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">
          {swapOptionSourceLabel(option.source)}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {option.equipment.map((item) => (
          <span
            key={item}
            className="rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--mantine-color-dimmed)]"
          >
            {formatEquipmentLabel(item)}
          </span>
        ))}
      </div>
    </button>
  )
}

function swapOptionSourceLabel(source: MovementSwapOption['source']) {
  if (source === 'default') return 'Default'
  return source === 'rule' ? 'Suggested' : 'Related'
}
