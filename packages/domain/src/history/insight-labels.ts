import type { ExperienceMode } from '@sheetless/domain/account/types'
import type { HistoryTab } from '@sheetless/domain/history/history-tabs'

/**
 * Guided and Full name the same numbers differently — the figures never change, only what they
 * are called. Guided uses the words a lifter would use; Full uses the words the sport uses.
 *
 * Tab *values* are URL state and are deep-linked from Today, so only labels vary here.
 */
type ModeLabel = Record<ExperienceMode, string>

const label = (guided: string, full: string): ModeLabel => ({ guided, full })

export const insightTabLabels: Record<HistoryTab, ModeLabel> = {
  overview: label('Overview', 'Overview'),
  strength: label('Strength', 'Strength'),
  'body-load': label('Muscles', 'Muscle fatigue'),
  movements: label('Exercises', 'Movements'),
  records: label('Records', 'Records'),
  sessions: label('Sessions', 'Sessions'),
}

export const insightCardLabels = {
  strengthScore: label('Strength score', 'DOTS'),
  volume: label('Weight moved', 'Tonnage'),
  volumeWeekly: label('Weight moved each week', 'Weekly tonnage'),
  consistency: label('Showing up', 'Consistency'),
  effort: label('How hard it felt', 'Effort'),
  liftTrend: label('Strength over time', 'Strength trend'),
  muscleBalance: label('Muscle balance', 'Muscle balance'),
} satisfies Record<string, ModeLabel>

/**
 * The muscle-workload screen's own headings.
 *
 * The tab is already `label('Muscles', 'Muscle fatigue')` above, but the panel headings used to be
 * hardcoded to the Full wording — so Guided showed a tab called "Muscles" opening a panel headed
 * "Muscle fatigue". Everything on that screen now reads from here.
 */
export const bodyLoadLabels = {
  fatigueHeading: label('Recent muscle work', 'Muscle fatigue'),
  setsHeading: label('Sets each week', 'Weekly sets'),
  fatigueToggle: label('Recent work', 'Fatigue'),
  setsToggle: label('Weekly sets', 'Weekly sets'),
  fatigueRows: label('Most worked first', 'Affected regions · most to least'),
  setsRows: label('Most sets first', 'Sets per week · most to least'),
  weekChange: label('vs the week before', 'Δ vs prior week'),
} satisfies Record<string, ModeLabel>

export function bodyLoadLabel(key: keyof typeof bodyLoadLabels, mode: ExperienceMode): string {
  return bodyLoadLabels[key][mode]
}

export type InsightCardKey = keyof typeof insightCardLabels

export function insightCardLabel(key: InsightCardKey, mode: ExperienceMode): string {
  return insightCardLabels[key][mode]
}

export function insightTabLabel(tab: HistoryTab, mode: ExperienceMode): string {
  return insightTabLabels[tab][mode]
}

/**
 * Full never hides a card for thin data — it shows the figure and says the sample is small.
 * Guided replaces the card with what would open it.
 */
export const thinDataBadgeLabel = 'Thin data'
