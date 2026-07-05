import { ActionIcon, NumberInput, Select, Tooltip } from '@mantine/core'
import { Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Panel } from '~/components'
import { clampIntegerInput } from '~/domains/program/lib/custom-builder-ui'

export function BuilderExerciseRow({
  select,
  numbers,
  numberColumns,
  action,
}: {
  select: ReactNode
  numbers: ReactNode
  numberColumns: 'three' | 'four'
  action: ReactNode
}) {
  const numberGridClass =
    numberColumns === 'four'
      ? 'grid grid-cols-2 gap-2 sm:grid-cols-4 md:w-[20rem]'
      : 'grid grid-cols-2 gap-2 sm:grid-cols-3 md:w-[15rem]'

  return (
    <Panel surface="panel" p="sm">
      <div className="grid gap-3 md:grid-cols-[minmax(12rem,20rem)_auto_auto] md:items-end">
        <div className="min-w-0">{select}</div>
        <div className={numberGridClass}>{numbers}</div>
        <div className="flex justify-end md:justify-start">{action}</div>
      </div>
    </Panel>
  )
}

export function DeleteRowAction({
  label,
  disabled = false,
  onClick,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <Tooltip label={label}>
      <span>
        <ActionIcon
          color="danger"
          variant="light"
          size="lg"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
        >
          <Trash2 size={16} />
        </ActionIcon>
      </span>
    </Tooltip>
  )
}

export function BuilderSelect({
  label,
  value,
  options,
  disabled = false,
  clearable = false,
  placeholder,
  onChange,
}: {
  label: string
  value: string | null
  options: Array<{ value: string; label: string }>
  disabled?: boolean
  clearable?: boolean
  placeholder?: string
  onChange: (value: string | null) => void
}) {
  return (
    <Select
      label={label}
      value={value}
      data={options}
      disabled={disabled}
      clearable={clearable}
      searchable
      placeholder={placeholder}
      // Portal the dropdown over the modal and anchor it to the viewport so the on-screen
      // keyboard / modal scroll can't make it (and the modal) jump on mobile.
      comboboxProps={{ withinPortal: true, position: 'bottom-start', middlewares: { flip: true, shift: false } }}
      onChange={(nextValue) => {
        if (nextValue === null && !clearable) return
        onChange(nextValue)
      }}
    />
  )
}

export function BuilderNumberField({
  label,
  value,
  min = 1,
  max = 50,
  onChange,
}: {
  label: string
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
}) {
  return (
    <NumberInput
      label={label}
      min={min}
      max={max}
      allowDecimal={false}
      clampBehavior="strict"
      value={value}
      onChange={(nextValue) => onChange(clampIntegerInput(nextValue, value, min, max))}
    />
  )
}
