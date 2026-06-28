import { Badge } from '@mantine/core'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { Caption, SectionLabel, Text } from '~/components'
import type { MovementSlot } from '~/shared/types'

export function StatusPanel({ tone, children }: { tone: 'warning' | 'danger'; children: ReactNode }) {
  return (
    <Text
      component="p"
      size="xs"
      className="rounded-2xl border p-3 md:rounded-2xl"
      c={tone === 'danger' ? 'var(--vf-danger-text)' : 'var(--vf-warning-text)'}
      style={{
        borderColor: tone === 'danger' ? 'var(--vf-danger-border)' : 'var(--vf-warning-border)',
        backgroundColor: tone === 'danger' ? 'var(--vf-danger-soft)' : 'var(--vf-warning-soft)',
      }}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      {children}
    </Text>
  )
}

export function MetaPill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'danger' }) {
  return (
    <Badge color={tone === 'danger' ? 'danger' : 'neutral'} variant="light" radius="xl">
      {children}
    </Badge>
  )
}

export function RolePill({ role, subtle = false }: { role: MovementSlot['role']; subtle?: boolean }) {
  return (
    <Badge color={role === 'main' ? 'accent' : 'neutral'} variant="light" style={{ opacity: subtle ? 0.9 : undefined }}>
      {role}
    </Badge>
  )
}

export function HistoryStatus({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'danger' }) {
  return (
    <Text
      component="p"
      size="sm"
      className="rounded-2xl border p-3"
      c={tone === 'danger' ? 'var(--vf-danger-text)' : 'var(--mantine-color-dimmed)'}
      style={{
        borderColor: tone === 'danger' ? 'var(--vf-danger-border)' : 'var(--mantine-color-default-border)',
        backgroundColor: tone === 'danger' ? 'var(--vf-danger-soft)' : 'var(--vf-surface-2)',
      }}
    >
      {children}
    </Text>
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
      className="flex h-8 w-8 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-45 md:h-7 md:w-auto md:gap-1 md:rounded-full md:px-2.5"
      style={{
        borderColor: 'var(--mantine-color-default-border)',
        backgroundColor: 'var(--vf-surface-2)',
        color: 'var(--mantine-color-dimmed)',
      }}
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      <Text component="span" size="0.6875rem" fw={700} c="inherit" className="hidden md:inline">
        {label}
      </Text>
    </button>
  )
}

export function MetricBlock({ label, value, align = 'left' }: { label: string; value: string; align?: 'left' | 'right' }) {
  return (
    <div style={{ textAlign: align }}>
      <SectionLabel size="0.5625rem" lh={1}>
        {label}
      </SectionLabel>
      <Text component="p" mt={2} size="sm" fw={700}>
        {value}
      </Text>
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
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: 'var(--vf-success-text)', color: 'white' }}
      >
        <Check size={10} />
      </span>
    )
  }
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
      style={{
        backgroundColor: active ? 'var(--mantine-primary-color-filled)' : 'var(--vf-surface-3)',
        color: active ? 'white' : 'var(--mantine-color-dimmed)',
      }}
    >
      <Text component="span" size="0.5625rem" fw={900} c="inherit">
        {number}
      </Text>
    </span>
  )
}

export function QuickAdjustButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      className="rounded-full border px-2 py-1 transition md:rounded-full md:px-2.5 md:py-0.5"
      style={{
        borderColor: 'var(--mantine-color-default-border)',
        backgroundColor: 'var(--mantine-color-default)',
        color: 'var(--mantine-color-dimmed)',
      }}
      onClick={onClick}
    >
      <Caption component="span" fw={700} c="inherit">
        {children}
      </Caption>
    </button>
  )
}
