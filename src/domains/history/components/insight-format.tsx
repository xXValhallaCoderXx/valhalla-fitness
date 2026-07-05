import type { AccentColor } from '~/domains/history/lib/insights'
import type { BodyLoadRegion, HistoryBestSet, Unit } from '~/shared/types'
import { Text } from '~/components'

export type HistoryTab = 'overview' | 'body-load' | 'movements' | 'records' | 'sessions'

export const HISTORY_TAB_VALUES: HistoryTab[] = ['overview', 'body-load', 'movements', 'records', 'sessions']

/** Mantine palette names → themed CSS variables for dots, stripes, and rings. */
export const ACCENT_TEXT: Record<AccentColor, string> = {
  action: 'var(--vf-action-text)',
  accent: 'var(--vf-accent-text)',
  warning: 'var(--vf-warning-text)',
  success: 'var(--vf-success-text)',
  danger: 'var(--vf-danger-text)',
  neutral: 'var(--mantine-color-dimmed)',
}
export const ACCENT_SOFT: Record<AccentColor, string> = {
  action: 'var(--vf-action-soft)',
  accent: 'var(--vf-accent-soft)',
  warning: 'var(--vf-warning-soft)',
  success: 'var(--vf-success-soft)',
  danger: 'var(--vf-danger-soft)',
  neutral: 'var(--vf-surface-2)',
}

export const historySearchInputStyles = {
  input: {
    borderColor: 'var(--mantine-color-default-border)',
    backgroundColor: 'var(--vf-surface-2)',
  },
}

export function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-3 py-1.5"
      style={{
        whiteSpace: 'nowrap',
        backgroundColor: active ? 'var(--vf-action-soft)' : 'var(--vf-surface-2)',
        border: `1px solid ${active ? 'var(--vf-action-border)' : 'var(--mantine-color-default-border)'}`,
      }}
    >
      <Text component="span" size="xs" fw={700} tt="capitalize" c={active ? 'var(--vf-action-text)' : 'var(--mantine-color-dimmed)'}>
        {label}
      </Text>
    </button>
  )
}

export function bodyLoadColor(tier: BodyLoadRegion['tier']) {
  if (tier === 'high') return 'var(--vf-danger-text)'
  if (tier === 'moderate') return 'var(--vf-warning-text)'
  if (tier === 'low') return 'var(--vf-action-text)'
  return 'var(--mantine-color-dimmed)'
}

export function toneForTier(tier: BodyLoadRegion['tier']) {
  if (tier === 'high') return 'danger'
  if (tier === 'moderate') return 'warning'
  if (tier === 'low') return 'action'
  return 'dimmed'
}

export function formatBestSetPrimary(set: HistoryBestSet) {
  const load = set.load == null ? 'Bodyweight' : `${formatNumber(set.load)} ${set.units ?? ''}`.trim()
  const reps = `${set.reps ?? '-'}${set.type === 'amrap' ? '+' : ''}`
  return `${load} × ${reps} reps`
}

export function formatE1rm(set: HistoryBestSet) {
  return typeof set.e1rm === 'number' ? `${formatNumber(set.e1rm)} ${set.units ?? ''}`.trim() : '—'
}

export function formatLoad(value?: number | null, units?: Unit | null) {
  if (!value) return `0 ${units ?? ''}`.trim()
  return `${formatNumber(value)} ${units ?? ''}`.trim()
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value)
}
