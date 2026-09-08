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
