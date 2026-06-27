import { Minus, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { Caption } from '~/components'

/** Big −/＋ stepper with a tap-to-type centre value. Used for weight and reps in focus mode. */
export function FocusStepper({
  label,
  unitSuffix,
  value,
  step,
  onAdjust,
  onType,
  disabled = false,
  dataTour,
}: {
  label: string
  unitSuffix?: string
  value: number
  step: number
  onAdjust: (delta: number) => void
  onType: (value: number) => void
  disabled?: boolean
  dataTour?: string
}) {
  return (
    <div
      data-tour={dataTour}
      className="rounded-2xl border p-3"
      style={{ borderColor: 'var(--mantine-color-default-border)', backgroundColor: 'var(--vf-surface-2)' }}
    >
      <Caption component="div" ta="center" tt="uppercase" fw={800} size="0.625rem" style={{ letterSpacing: '0.08em' }}>
        {label}
        {unitSuffix ? ` (${unitSuffix})` : ''}
      </Caption>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <StepButton ariaLabel={`Decrease ${label}`} disabled={disabled} onClick={() => onAdjust(-step)}>
          <Minus size={20} />
        </StepButton>
        <input
          type="number"
          inputMode="decimal"
          aria-label={label}
          className="live-session-input min-w-0 flex-1 text-center outline-none"
          style={{
            border: 'none',
            backgroundColor: 'transparent',
            fontSize: '2rem',
            fontWeight: 900,
            lineHeight: 1.1,
            color: 'var(--mantine-color-text)',
          }}
          value={Number.isFinite(value) ? value : 0}
          disabled={disabled}
          onChange={(event) => onType(Number(event.target.value))}
        />
        <StepButton ariaLabel={`Increase ${label}`} disabled={disabled} onClick={() => onAdjust(step)}>
          <Plus size={20} />
        </StepButton>
      </div>
    </div>
  )
}

function StepButton({
  children,
  ariaLabel,
  onClick,
  disabled,
}: {
  children: ReactNode
  ariaLabel: string
  onClick: () => void
  disabled: boolean
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border transition active:scale-95 disabled:opacity-40"
      style={{
        borderColor: 'var(--mantine-color-default-border)',
        backgroundColor: 'var(--mantine-color-default)',
        color: 'var(--mantine-color-text)',
      }}
    >
      {children}
    </button>
  )
}
