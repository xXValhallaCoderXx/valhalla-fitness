import type { AccentTone, EffortTone } from '~/domains/history/lib/workout-summary'

export const TONE_TEXT: Record<AccentTone | EffortTone, string> = {
  action: 'var(--vf-action-text)',
  accent: 'var(--vf-accent-text)',
  warning: 'var(--vf-warning-text)',
  success: 'var(--vf-success-text)',
  danger: 'var(--vf-danger-text)',
  neutral: 'var(--mantine-color-dimmed)',
}

export const TONE_SOFT: Record<AccentTone | EffortTone, string> = {
  action: 'var(--vf-action-soft)',
  accent: 'var(--vf-accent-soft)',
  warning: 'var(--vf-warning-soft)',
  success: 'var(--vf-success-soft)',
  danger: 'var(--vf-danger-soft)',
  neutral: 'var(--vf-surface-2)',
}
