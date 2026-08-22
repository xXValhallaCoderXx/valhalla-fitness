import type { AccentColor } from '~/domains/history/lib/insights'
import type { BodyLoadRegion } from '~/domains/history'
import { Text } from '~/components'

export { HISTORY_TAB_VALUES } from '~/domains/history/lib/history-tabs'
export type { HistoryTab } from '~/domains/history/lib/history-tabs'
export {
  formatBestSetPrimary,
  formatE1rm,
  formatLoad,
  formatNumber,
  hasDisplayE1rm,
} from '@sheetless/domain/history/insight-format'

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

