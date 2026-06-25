import { Checkbox, Select, TextInput } from '@mantine/core'
import { Info } from 'lucide-react'
import { accessoryProgressionOptions } from '~/domains/session/lib/accessories'
import { cn } from '~/shared/lib/cn'
import type { AccessoryProgressionMethod, SwapScope } from '~/shared/types'

type AddAccessoryConfigPanelProps = {
  progressionMethod: AccessoryProgressionMethod
  methodHelpOpen: boolean
  repMin: string
  repMax: string
  repTargetError?: string
  parsedRepLabel: string | null
  note: string
  scope: SwapScope
  phaseLabel: string
  selectedMovementName: string | null
  isPending: boolean
  canSubmit: boolean
  onProgressionMethodChange: (value: AccessoryProgressionMethod) => void
  onMethodHelpOpenChange: (value: boolean) => void
  onRepMinChange: (value: string) => void
  onRepMaxChange: (value: string) => void
  onNoteChange: (value: string) => void
  onScopeChange: (value: SwapScope) => void
  onClose: () => void
  onSubmit: () => void
}

export function AddAccessoryConfigPanel({
  progressionMethod,
  methodHelpOpen,
  repMin,
  repMax,
  repTargetError,
  parsedRepLabel,
  note,
  scope,
  phaseLabel,
  selectedMovementName,
  isPending,
  canSubmit,
  onProgressionMethodChange,
  onMethodHelpOpenChange,
  onRepMinChange,
  onRepMaxChange,
  onNoteChange,
  onScopeChange,
  onClose,
  onSubmit,
}: AddAccessoryConfigPanelProps) {
  return (
    <div className="space-y-2.5 rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-2.5 sm:p-3">
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="vf-section-label">Progression</p>
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] text-[var(--mantine-color-dimmed)] transition hover:bg-[var(--vf-surface-2)] hover:text-[var(--mantine-color-text)]"
            aria-label="Explain progression methods"
            aria-pressed={methodHelpOpen}
            title="Explain progression methods"
            onClick={() => onMethodHelpOpenChange(!methodHelpOpen)}
          >
            <Info size={13} />
          </button>
        </div>
      </div>
      <Select
        label="Method"
        data={accessoryProgressionOptions}
        value={progressionMethod}
        onChange={(value) => onProgressionMethodChange((value ?? 'history_only') as AccessoryProgressionMethod)}
        allowDeselect={false}
        disabled={isPending}
        classNames={{
          label: '!text-[var(--mantine-color-dimmed)] !text-xs !font-bold',
          input: '!border-[var(--mantine-color-default-border)] !bg-[var(--mantine-color-default)] !text-[var(--mantine-color-text)]',
          dropdown: '!border-[var(--mantine-color-default-border)] !bg-[var(--mantine-color-default)]',
          option: '!text-[var(--mantine-color-text)] hover:!bg-[var(--vf-surface-2)]',
        }}
      />
      {methodHelpOpen || progressionMethod === 'double_progression' ? <ProgressionMethodInfo /> : null}
      <div>
        <p className="mb-1 text-xs font-bold text-[var(--mantine-color-dimmed)]">Reps</p>
        <div className="grid grid-cols-2 gap-2">
          <TextInput
            aria-label="Minimum reps"
            value={repMin}
            onChange={(event) => onRepMinChange(sanitizeRepInput(event.target.value))}
            placeholder="8"
            inputMode="numeric"
            maxLength={3}
            disabled={isPending}
            classNames={{
              input: cn(
                '!border-[var(--mantine-color-default-border)] !bg-[var(--mantine-color-default)] !text-[var(--mantine-color-text)]',
                repTargetError && '!border-[var(--vf-danger-border)]',
              ),
            }}
          />
          <TextInput
            aria-label="Maximum reps"
            value={repMax}
            onChange={(event) => onRepMaxChange(sanitizeRepInput(event.target.value))}
            placeholder="12"
            inputMode="numeric"
            maxLength={3}
            disabled={isPending}
            classNames={{
              input: cn(
                '!border-[var(--mantine-color-default-border)] !bg-[var(--mantine-color-default)] !text-[var(--mantine-color-text)]',
                repTargetError && '!border-[var(--vf-danger-border)]',
              ),
            }}
          />
        </div>
        {repTargetError ? (
          <p className="mt-1 text-[11px] font-semibold text-[var(--vf-danger-text)]">{repTargetError}</p>
        ) : null}
      </div>
      <AccessoryGuidance />
      <TextInput
        label="Note"
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
        placeholder="Optional"
        disabled={isPending}
        classNames={{
          label: '!text-[var(--mantine-color-dimmed)] !text-xs !font-bold',
          input: '!border-[var(--mantine-color-default-border)] !bg-[var(--mantine-color-default)] !text-[var(--mantine-color-text)]',
        }}
      />
      <Checkbox
        checked={scope === 'phase_slot'}
        disabled={isPending}
        onChange={(event) => onScopeChange(event.currentTarget.checked ? 'phase_slot' : 'session')}
        label={phaseLabel}
        classNames={{
          label: '!text-xs !font-semibold !text-[var(--mantine-color-text)] sm:!text-sm',
          input: '!border-[var(--mantine-color-default-border)]',
        }}
      />
      <div className="rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] p-2.5">
        <p className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">Selected</p>
        <p className="mt-1 text-sm font-extrabold">{selectedMovementName ?? 'No movement selected'}</p>
        <p className="mt-0.5 text-xs text-[var(--mantine-color-dimmed)]">
          {parsedRepLabel ?? 'No reps'} reps · {progressionMethod === 'double_progression' ? 'Double progression' : 'History only'} · {scope === 'phase_slot' ? phaseLabel : 'This session only'}
        </p>
      </div>
      <div className="sticky bottom-0 -mx-2.5 -mb-2.5 grid grid-cols-2 gap-2 border-t border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-2.5 pt-2 sm:-mx-3 sm:-mb-3 sm:p-3 lg:static lg:mx-0 lg:mb-0 lg:border-t-0 lg:bg-transparent lg:p-0 lg:pt-1">
        <button
          type="button"
          className="rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-4 py-2 text-sm font-bold text-[var(--mantine-color-text)] transition hover:bg-[var(--vf-surface-2)] disabled:opacity-60"
          disabled={isPending}
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded-md bg-[var(--mantine-primary-color-filled)] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[var(--mantine-primary-color-filled-hover)] disabled:opacity-60"
          disabled={!canSubmit || isPending}
          onClick={onSubmit}
        >
          {isPending ? 'Adding...' : 'Add'}
        </button>
      </div>
    </div>
  )
}

function ProgressionMethodInfo() {
  return (
    <div className="rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-2.5 py-2 text-[11px] leading-snug text-[var(--mantine-color-dimmed)]">
      <span className="font-bold text-[var(--mantine-color-text)]">Double progression</span> keeps the load the same until all sets reach the max reps at the target RIR, then suggests adding load next time. None only records history.
    </div>
  )
}

function AccessoryGuidance() {
  return (
    <div className="rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-2.5 py-2 text-[11px] leading-snug text-[var(--mantine-color-dimmed)]">
      <div className="flex items-center gap-1.5 font-bold text-[var(--mantine-color-text)]">
        <Info size={13} />
        Accessory rep targets
      </div>
      <p className="mt-1">Most accessories sit around 8-20 reps. Use 6-10 for heavier close variations, and 12-30 for isolation or pump work.</p>
    </div>
  )
}

function sanitizeRepInput(value: string) {
  return value.replace(/\D/g, '').slice(0, 3)
}
