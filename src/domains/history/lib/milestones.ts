import type { Milestone, MilestoneKind, MilestoneSummary, Unit } from '~/shared/types'

/** Thresholds are in display units — trophies are deliberately unit-relative (10k lb ≙ 10k kg). */
export const MILESTONE_TONNAGE = [10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000]
export const MILESTONE_SESSIONS = [1, 10, 25, 50, 100, 250]
export const MILESTONE_SETS = [100, 500, 1000, 2500, 5000]

const milestoneKindOrder: MilestoneKind[] = ['tonnage', 'sessions', 'sets']

const milestoneThresholds: Record<MilestoneKind, number[]> = {
  tonnage: MILESTONE_TONNAGE,
  sessions: MILESTONE_SESSIONS,
  sets: MILESTONE_SETS,
}

function compactCount(value: number): string {
  if (value >= 1_000_000) return `${value / 1_000_000}M`
  if (value >= 1000) return `${value / 1000}k`
  return `${value}`
}

function milestoneLabel(kind: MilestoneKind, threshold: number, units: Unit | null): string {
  switch (kind) {
    case 'tonnage':
      return `${compactCount(threshold)} ${units ?? 'kg'} moved`
    case 'sessions':
      return threshold === 1 ? '1 session' : `${threshold} sessions`
    case 'sets':
      return `${compactCount(threshold)} sets`
  }
}

/**
 * Lifetime trophy badges. Earned = every crossed threshold (>=), ordered by kind
 * (tonnage → sessions → sets) then ascending threshold. nextUp = the single
 * closest-to-completion uncrossed milestone across all kinds (highest
 * progressPercent; ties resolve to the earlier kind in the order above), or
 * null once everything is earned.
 */
export function buildMilestones(input: {
  tonnage: number
  sessions: number
  sets: number
  units: Unit | null
}): MilestoneSummary {
  const earned: Milestone[] = []
  let nextUp: MilestoneSummary['nextUp'] = null

  for (const kind of milestoneKindOrder) {
    const current = input[kind]
    for (const threshold of milestoneThresholds[kind]) {
      const label = milestoneLabel(kind, threshold, input.units)
      if (current >= threshold) {
        earned.push({ kind, threshold, label })
        continue
      }
      const progressPercent = Math.round((100 * current) / threshold)
      if (!nextUp || progressPercent > nextUp.progressPercent) {
        nextUp = { kind, threshold, label, progressPercent }
      }
      // Higher thresholds within a kind are always less progressed.
      break
    }
  }

  return { earned, nextUp }
}
