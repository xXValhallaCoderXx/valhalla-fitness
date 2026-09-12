import type { BodyLoadRegion } from '~/domains/history'
import type { AdequacyTier } from '~/domains/history/lib/muscle-volume'

/** Fatigue ramp: the hotter the tier, the more alarming the colour. */
export function bodyLoadFill(tier: BodyLoadRegion['tier']) {
  if (tier === 'high') return 'var(--vf-danger-text)'
  if (tier === 'moderate') return 'var(--vf-warning-text)'
  if (tier === 'low') return 'var(--vf-action-text)'
  return 'var(--mantine-color-dimmed)'
}

/** Adequacy ramp: in-range is the good state, so it is the green one — not the hottest. */
export function adequacyFill(tier: AdequacyTier) {
  if (tier === 'in_range') return 'var(--vf-success-text)'
  if (tier === 'high') return 'var(--vf-warning-text)'
  return 'var(--mantine-color-dimmed)'
}

export function adequacyTone(tier: AdequacyTier): 'success' | 'warning' | 'dimmed' {
  if (tier === 'in_range') return 'success'
  if (tier === 'high') return 'warning'
  return 'dimmed'
}
