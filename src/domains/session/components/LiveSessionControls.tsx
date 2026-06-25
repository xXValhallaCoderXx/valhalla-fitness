import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '~/shared/lib/cn'
import type { MovementSlot } from '~/shared/types'

export function StatusPanel({ tone, children }: { tone: 'warning' | 'danger'; children: ReactNode }) {
  return (
    <p
      className={cn(
        'rounded-2xl border p-3 text-xs md:rounded-xl',
        tone === 'warning' && 'border-[var(--vf-warning-border)] bg-[var(--vf-warning-soft)] text-[var(--vf-warning-text)]',
        tone === 'danger' && 'border-[var(--vf-danger-border)] bg-[var(--vf-danger-soft)] text-[var(--vf-danger-text)]',
      )}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      {children}
    </p>
  )
}

export function MetaPill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'danger' }) {
  return (
    <span
      className={cn(
        'rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider',
        tone === 'danger'
          ? 'border-[var(--vf-danger-border)] bg-[var(--vf-danger-soft)] text-[var(--vf-danger-text)]'
          : 'border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] text-[var(--mantine-color-dimmed)]',
      )}
    >
      {children}
    </span>
  )
}

export function RolePill({ role, subtle = false }: { role: MovementSlot['role']; subtle?: boolean }) {
  const roleColor = role === 'main' ? 'text-[var(--mantine-color-accent-filled)]' : 'text-[var(--mantine-color-dimmed)]'
  const roleBg = role === 'main' ? 'bg-[var(--vf-accent-soft)]' : 'bg-[var(--vf-surface-2)]'
  return (
    <span
      className={cn(
        'rounded border border-[var(--mantine-color-default-border)] px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider md:text-[9px]',
        roleColor,
        roleBg,
        subtle && 'opacity-90',
      )}
    >
      {role}
    </span>
  )
}

export function HistoryStatus({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'danger' }) {
  return (
    <p className={cn('rounded-xl border p-3 text-sm', tone === 'danger' ? 'border-[var(--vf-danger-border)] bg-[var(--vf-danger-soft)] text-[var(--vf-danger-text)]' : 'border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] text-[var(--mantine-color-dimmed)]')}>
      {children}
    </p>
  )
}

export function ToolButton({
  title,
  icon,
  label,
  onClick,
  disabled = false,
}: {
  title: string
  icon: ReactNode
  label: string
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] text-[var(--mantine-color-dimmed)] transition hover:border-[var(--vf-action-border)] hover:bg-[var(--vf-surface-3)] hover:text-[var(--mantine-color-text)] disabled:cursor-not-allowed disabled:opacity-45 md:h-7 md:w-auto md:gap-1 md:rounded-lg md:px-2 md:text-[11px] md:font-semibold"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  )
}

export function MetricBlock({ label, value, align = 'left' }: { label: string; value: string; align?: 'left' | 'right' }) {
  return (
    <div className={cn(align === 'right' && 'text-right')}>
      <p className="text-[8px] font-extrabold uppercase tracking-wider text-[var(--mantine-color-dimmed)] md:text-[9px]">
        {label}
      </p>
      <p className="mt-0.5 text-[11px] font-bold text-[var(--mantine-color-text)] md:text-sm">{value}</p>
    </div>
  )
}

export function MovementNumberBadge({
  number,
  active = false,
  complete = false,
}: {
  number: number
  active?: boolean
  complete?: boolean
}) {
  if (complete) {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
        <Check size={10} />
      </span>
    )
  }
  return (
    <span
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-extrabold',
        active
          ? 'bg-[var(--mantine-primary-color-filled)] text-white'
          : 'bg-[var(--vf-surface-3)] text-[var(--mantine-color-dimmed)]',
      )}
    >
      {number}
    </span>
  )
}

export function QuickAdjustButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-1.5 py-1 text-[9px] font-bold text-[var(--mantine-color-dimmed)] transition hover:border-[var(--vf-action-border)] hover:bg-[var(--vf-surface-2)] md:rounded-md md:px-2 md:py-0.5 md:text-[10px]"
      onClick={onClick}
    >
      {children}
    </button>
  )
}
