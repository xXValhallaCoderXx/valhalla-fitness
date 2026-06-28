import { Badge, Button, TextInput } from '@mantine/core'
import { Caption, SectionLabel, Text } from '~/components'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { cn } from '~/shared/lib/cn'
import type { AccessoryMovementOption } from '~/shared/types'
import { insetFieldStyles } from './form-styles'
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
        styles={insetFieldStyles}
      />
      <AccessoryCategoryFilters
        value={categoryFilter}
        options={categoryFilters}
        totalCount={totalCount}
        onChange={onCategoryChange}
      />
      <div className="flex min-h-5 items-center justify-between gap-2">
        <SectionLabel component="span">
          {filteredOptions.length} movement{filteredOptions.length === 1 ? '' : 's'}
        </SectionLabel>
        {search.trim() || categoryFilter !== 'all' ? (
          <Button
            type="button"
            size="compact-xs"
            variant="subtle"
            onClick={onClearFilters}
          >
            Clear filters
          </Button>
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
      )}
      style={{
        borderColor: selected ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-default-border)',
        backgroundColor: selected ? 'var(--vf-action-soft)' : 'var(--vf-surface-2)',
      }}
      onClick={onSelect}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Text component="p" size="sm" fw={900} lh={1.15}>
            {option.movementName}
          </Text>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
            <Caption component="span" fw={700} lh={1}>
              {formatCategoryLabel(option.category)}
            </Caption>
            {option.equipment.map((item) => (
              <Badge key={item} color="neutral" variant="default">
                {formatEquipmentLabel(item)}
              </Badge>
            ))}
          </div>
        </div>
        <Badge color="neutral" variant="default">
          {option.defaultUnit}
        </Badge>
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
      className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 transition"
      style={{
        borderColor: active ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-default-border)',
        backgroundColor: active ? 'var(--vf-action-soft)' : 'var(--mantine-color-default)',
        color: active ? 'var(--vf-action-text)' : 'var(--mantine-color-dimmed)',
      }}
      onClick={onClick}
    >
      <Text component="span" size="xs" fw={900} c="inherit">
        {label}
      </Text>
      <Text component="span" size="0.625rem" c="inherit" opacity={0.75}>
        {count}
      </Text>
    </button>
  )
}
