import type { SessionHardness } from '@sheetless/domain/shared/types'
import type { TemplateWeekDefinition } from '@sheetless/domain/program/types'

/**
 * Guided vocabulary for a week's intensity.
 *
 * Guided never shows the hardness token itself — "Hard" is a grading, not a description. These say
 * what the week is actually like. Shared by Today's header subtitle and Plan's week strip so the
 * two screens cannot describe the same week differently.
 */
export const guidedWeekCharacter: Record<SessionHardness, string> = {
  Light: 'a lighter week',
  Medium: 'a steady week',
  Hard: 'the heaviest week',
  Deload: 'a deload week',
}

/**
 * The one-line descriptor under a week's name in Plan's Guided strip.
 *
 * Prefers the wave label, then the phase label, then the hardness character. Wave first because a
 * long programme repeats its phase across many weeks — an 18-week cycle has six "Base phase" weeks
 * but names its waves "Volume wave" / "Top-set wave", which is what actually tells them apart.
 *
 * Deliberately not `week.summary` — that is a full technical sentence ("65%x5, 75%x5, 85%x5+ with
 * back-off 5x5."), which is Full's register, not Guided's.
 */
export function guidedWeekDescriptor(
  week: Pick<TemplateWeekDefinition, 'phaseLabel' | 'hardness'> & { waveLabel?: string },
): string {
  const label = week.waveLabel?.trim() || week.phaseLabel?.trim()
  if (label) return label.charAt(0).toUpperCase() + label.slice(1)
  return guidedWeekCharacter[week.hardness] ?? ''
}
