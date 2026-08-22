import type { Tone } from '@sheetless/tokens'

export type { Tone }

const TONE_VARS: Record<Tone, string> = {
  default: 'var(--mantine-color-text)',
  dimmed: 'var(--mantine-color-dimmed)',
  action: 'var(--vf-action-text)',
  success: 'var(--vf-success-text)',
  warning: 'var(--vf-warning-text)',
  danger: 'var(--vf-danger-text)',
  accent: 'var(--vf-accent-text)',
}

/** Resolve a semantic tone to its themed CSS color variable (the web resolver). */
export function toneColor(tone?: Tone): string | undefined {
  return tone ? TONE_VARS[tone] : undefined
}
