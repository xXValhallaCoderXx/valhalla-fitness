import { Minus, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '~/shared/lib/cn'
import { selectAllOnFocus } from './live-session-utils'

export function LiveSetStepCell({
  value,
  disabled,
  muted,
  showSteppers,
  step,
  onAdjust,
  onFocus,
  onChange,
  dataTour,
  decreaseLabel,
  increaseLabel,
}: {
  value: number
  disabled: boolean
  muted: boolean
  showSteppers: boolean
  step: number
  onAdjust: (delta: number) => void
  onFocus: () => void
  onChange: (value: number) => void
  dataTour?: string
  decreaseLabel: string
  increaseLabel: string
}) {
  return (
    <div className="flex items-center gap-1">
      {showSteppers ? (
        <StepIconButton className="hidden md:inline-flex" ariaLabel={decreaseLabel} onClick={() => onAdjust(-step)}>
          <Minus size={13} />
        </StepIconButton>
      ) : null}
      <input
        type="number"
        data-tour={dataTour}
        className="live-session-input min-w-0 flex-1 rounded-lg border py-1.5 text-center outline-none transition md:px-1 md:py-1"
        style={{
          borderColor: 'var(--mantine-color-default-border)',
          backgroundColor: 'var(--mantine-color-default)',
          color: muted ? 'var(--mantine-color-dimmed)' : 'var(--mantine-color-text)',
          fontSize: 'var(--mantine-font-size-sm)',
          fontWeight: muted ? 600 : 700,
        }}
        value={Number.isFinite(value) ? value : 0}
        disabled={disabled}
        onFocus={(event) => {
          selectAllOnFocus(event)
          onFocus()
        }}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {showSteppers ? (
        <StepIconButton className="hidden md:inline-flex" ariaLabel={increaseLabel} onClick={() => onAdjust(step)}>
          <Plus size={13} />
        </StepIconButton>
      ) : null}
    </div>
  )
}

function StepIconButton({
  children,
  ariaLabel,
  onClick,
  className,
}: {
  children: ReactNode
  ariaLabel: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn('h-7 w-7 shrink-0 items-center justify-center rounded-full border transition active:scale-95', className)}
      style={{
        borderColor: 'var(--mantine-color-default-border)',
        backgroundColor: 'var(--vf-surface-2)',
        color: 'var(--mantine-color-dimmed)',
      }}
    >
      {children}
    </button>
  )
}
