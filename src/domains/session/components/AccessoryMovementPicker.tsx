import { TextInput } from '@mantine/core'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { cn } from '~/shared/lib/cn'
import type { AccessoryMovementOption } from '~/shared/types'
import { HistoryStatus } from './LiveSessionControls'
import { formatCategoryLabel, formatEquipmentLabel } from './live-session-utils'

type AccessoryMovementPickerProps = {
  search: string
  categoryFilter: string
  categoryFilters: Array<{ value: string; label: string; count: number }>
  totalCount: number
  filteredOptions: AccessoryMovementOption[]
  selectedMovementId: string | null
  isPending: boolean
  error: unknown
  onSearchChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onSelectMovement: (movementId: string) => void
  onClearFilters: () => void
}

export function AccessoryMovementPicker({
  search,
  categoryFilter,
  categoryFilters,
  totalCount,
  filteredOptions,
  selectedMovementId,
  isPending,
  error,
  onSearchChange,
  onCategoryChange,
  onSelectMovement,
  onClearFilters,
}: AccessoryMovementPickerProps) {
  return (
    <div className="min-h-0 space-y-2">
      <TextInput
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search accessory movements"
        classNames={{
          input: '!border-[var(--mantine-color-default-border)] !bg-[var(--vf-surface-2)] !text-[var(--mantine-color-text)]',
        }}
      />
      <AccessoryCategoryFilters
        value={categoryFilter}
        options={categoryFilters}
        totalCount={totalCount}
        onChange={onCategoryChange}
      />
      <div className="flex min-h-5 items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">
        <span>{filteredOptions.length} movement{filteredOptions.length === 1 ? '' : 's'}</span>
        {search.trim() || categoryFilter !== 'all' ? (
          <button
            type="button"
            className="rounded px-1.5 py-0.5 text-[var(--vf-action-text)] transition hover:bg-[var(--vf-action-soft)]"
            onClick={onClearFilters}
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {isPending ? (
        <HistoryStatus>Loading accessory movements...</HistoryStatus>
      ) : error ? (
        <HistoryStatus tone="danger">{getApiErrorMessage(error, 'Unable to load accessories')}</HistoryStatus>
      ) : filteredOptions.length ? (
        <div className="max-h-[30dvh] space-y-1.5 overflow-y-auto pr-1 sm:max-h-[42dvh] lg:max-h-[30rem]">
          {filteredOptions.map((option) => (
            <AccessoryOptionRow
              key={option.movementId}
              option={option}
              selected={option.movementId === selectedMovementId}
              onSelect={() => onSelectMovement(option.movementId)}
            />
          ))}
        </div>
      ) : (
        <HistoryStatus>No matching accessory movements found.</HistoryStatus>
      )}
    </div>
  )
}

function AccessoryOptionRow({
  option,
  selected,
  onSelect,
}: {
  option: AccessoryMovementOption
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        'w-full rounded-lg border p-2.5 text-left transition',
        selected
          ? 'border-[var(--mantine-primary-color-filled)] bg-[var(--vf-action-soft)]'
          : 'border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] hover:border-[var(--vf-action-border)]',
      )}
      onClick={onSelect}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-extrabold leading-tight text-[var(--mantine-color-text)]">{option.movementName}</p>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold leading-none text-[var(--mantine-color-dimmed)]">
              {formatCategoryLabel(option.category)}
            </span>
            {option.equipment.map((item) => (
              <span
                key={item}
                className="rounded border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-1.5 py-0.5 text-[9px] font-semibold leading-none text-[var(--mantine-color-dimmed)]"
              >
                {formatEquipmentLabel(item)}
              </span>
            ))}
          </div>
        </div>
        <span className="rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">
          {option.defaultUnit}
        </span>
      </div>
    </button>
  )
}

function AccessoryCategoryFilters({
  value,
  options,
  totalCount,
  onChange,
}: {
  value: string
  options: Array<{ value: string; label: string; count: number }>
  totalCount: number
  onChange: (value: string) => void
}) {
  if (!options.length) return null

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="flex w-max gap-1.5 sm:w-full sm:flex-wrap">
        <AccessoryCategoryFilterButton
          active={value === 'all'}
          count={totalCount}
          label="All"
          onClick={() => onChange('all')}
        />
        {options.map((option) => (
          <AccessoryCategoryFilterButton
            key={option.value}
            active={value === option.value}
            count={option.count}
            label={option.label}
            onClick={() => onChange(option.value)}
          />
        ))}
      </div>
    </div>
  )
}

function AccessoryCategoryFilterButton({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean
  count: number
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-extrabold transition',
        active
          ? 'border-[var(--mantine-primary-color-filled)] bg-[var(--vf-action-soft)] text-[var(--vf-action-text)]'
          : 'border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] text-[var(--mantine-color-dimmed)] hover:border-[var(--vf-action-border)] hover:text-[var(--mantine-color-text)]',
      )}
      onClick={onClick}
    >
      <span>{label}</span>
      <span className="text-[10px] opacity-75">{count}</span>
    </button>
  )
}
