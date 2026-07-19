import type { Movement } from '~/shared/types'
import { getMovementName, movementCatalog } from '~/domains/movement/lib/movements'
import {
  anchorMovementIdFor,
  customProgramMethodologies,
  type CustomProgramBuilderInput,
  type CustomProgramMethodology,
} from './custom-program-meta'

/**
 * Best-effort guidance for the Custom Program Builder. This is pure (no React) so it can
 * power inline wizard warnings and be unit tested in isolation.
 *
 * The rules lean on the Base Strength (Bromley) themes used elsewhere in the app:
 * recovery has to scale as you get stronger (so high frequency / duplicated heavy work is
 * flagged), avoid junk volume (accessory + duplicate checks), and train the whole body
 * (weekly balance check).
 */

export type GuidanceSeverity = 'block' | 'warning' | 'info'

export type GuidanceCheck =
  | 'name'
  | 'session_count'
  | 'logger_empty'
  | 'schedule_fit'
  | 'duplicate_main'
  | 'accessory_volume'
  | 'weekly_balance'

/** 'global' applies to the whole programme; a number is a zero-based day index. */
export type GuidanceScope = 'global' | number

export type GuidanceIssue = {
  id: string
  check: GuidanceCheck
  severity: GuidanceSeverity
  scope: GuidanceScope
  message: string
  fix?: string
}

export type RecommendedDays = {
  /** Below this is a hard block — the methodology cannot fit its main lifts. */
  hardMin: number
  /** Below this (but at/above hardMin) is a soft warning. */
  idealMin: number
  /** Above this is a soft warning. */
  idealMax: number
  /** Short human label, e.g. "3-4 days". */
  label: string
  /** Tooltip copy explaining the recommendation. */
  rationale: string
}

const ACCESSORY_VOLUME_WARN_THRESHOLD = 4

export function recommendedDaysFor(methodology: CustomProgramMethodology): RecommendedDays {
  switch (methodology) {
    case 'none':
      return {
        hardMin: 1,
        idealMin: 1,
        idealMax: 7,
        label: '1-7 days',
        rationale: 'Logger sessions repeat exactly as written, so any weekly frequency works.',
      }
    case 'simple_linear':
      return {
        hardMin: 1,
        idealMin: 2,
        idealMax: 4,
        label: '2-4 days',
        rationale:
          'Linear progression adds load quickly; 2-4 days lets the same lifts recover before you load them again.',
      }
    case 'training_max_wave':
      return {
        hardMin: 2,
        idealMin: 3,
        idealMax: 4,
        label: '3-4 days',
        rationale:
          'Training-max waves rotate the main lifts; 3-4 days fits the four lifts without stacking heavy volume.',
      }
    case 'plus_set_wave':
      return {
        hardMin: 2,
        idealMin: 3,
        idealMax: 4,
        label: '3-4 days',
        rationale:
          'Plus-set waves periodise heavy main work; recovery has to scale as loads climb, so 3-4 days is the sweet spot.',
      }
  }
}

export function evaluateCustomProgramDraft(
  draft: CustomProgramBuilderInput,
  catalog: Record<string, Movement> = movementCatalog,
): GuidanceIssue[] {
  const issues: GuidanceIssue[] = []
  const { methodology, daysPerWeek, sessions } = draft
  const isLogger = methodology === 'none'
  const shortLabel = customProgramMethodologies[methodology].shortLabel

  if (draft.name.trim().length < 3) {
    issues.push({
      id: 'name',
      check: 'name',
      severity: 'block',
      scope: 'global',
      message: 'Give your programme a name (at least 3 characters).',
    })
  }

  if (sessions.length !== daysPerWeek) {
    issues.push({
      id: 'session_count',
      check: 'session_count',
      severity: 'block',
      scope: 'global',
      message: 'The number of sessions does not match the days per week.',
    })
  }

  const rec = recommendedDaysFor(methodology)
  if (daysPerWeek < rec.hardMin) {
    issues.push({
      id: 'schedule_fit',
      check: 'schedule_fit',
      severity: 'block',
      scope: 'global',
      message: `${shortLabel} needs at least ${rec.hardMin} training days so the main lifts can spread across the week.`,
      fix: `Set days per week to ${rec.hardMin} or more.`,
    })
  } else if (daysPerWeek < rec.idealMin) {
    issues.push({
      id: 'schedule_fit',
      check: 'schedule_fit',
      severity: 'warning',
      scope: 'global',
      message: `Most lifters run ${shortLabel} at ${rec.label}. With ${daysPerWeek} day${daysPerWeek === 1 ? '' : 's'} you'll train fewer main lifts each week.`,
    })
  } else if (daysPerWeek > rec.idealMax) {
    issues.push({
      id: 'schedule_fit',
      check: 'schedule_fit',
      severity: 'warning',
      scope: 'global',
      message: `Running ${shortLabel} at ${daysPerWeek} days repeats the same heavy lifts often — recovery has to keep up as you get stronger. ${rec.label} is usually plenty.`,
    })
  }

  if (isLogger) {
    // Logger programmes are intentionally lenient: only the name/session/empty-day blocks apply.
    sessions.forEach((session, index) => {
      if (session.loggerExercises.length === 0) {
        issues.push({
          id: `logger_empty:${index}`,
          check: 'logger_empty',
          severity: 'block',
          scope: index,
          message: `Day ${index + 1} needs at least one exercise.`,
        })
      }
    })
    return issues
  }

  // --- regulated methodologies only below ---

  const anchors = sessions.map((session) => anchorMovementIdFor(session.mainMovementId, catalog))
  issues.push(...duplicateMainIssues(methodology, daysPerWeek, sessions, anchors))

  sessions.forEach((session, index) => {
    if (session.accessories.length > ACCESSORY_VOLUME_WARN_THRESHOLD) {
      issues.push({
        id: `accessory_volume:${index}`,
        check: 'accessory_volume',
        severity: 'warning',
        scope: index,
        message: `Day ${index + 1} has ${session.accessories.length} accessories. A pile of accessory work on a heavy day turns into junk volume — 2-4 quality movements is usually enough.`,
      })
    }
  })

  issues.push(...weeklyBalanceIssues(sessions, anchors, catalog))

  return issues
}

function duplicateMainIssues(
  methodology: CustomProgramMethodology,
  daysPerWeek: number,
  sessions: CustomProgramBuilderInput['sessions'],
  anchors: string[],
): GuidanceIssue[] {
  const issues: GuidanceIssue[] = []

  // Up to 4 days there is room for all four distinct competition lifts, so any repeat is
  // a missed-opportunity warning.
  if (daysPerWeek <= 4) {
    const firstSeen = new Map<string, number>()
    anchors.forEach((anchor, index) => {
      const earlier = firstSeen.get(anchor)
      if (earlier === undefined) {
        firstSeen.set(anchor, index)
        return
      }
      issues.push({
        id: `duplicate_main:${index}`,
        check: 'duplicate_main',
        severity: 'warning',
        scope: index,
        message: `Day ${index + 1} and Day ${earlier + 1} both train ${getMovementName(anchor)}. At ${daysPerWeek} days you have room for all four main lifts — pick a different lift to train your whole body.`,
      })
    })
    return issues
  }

  // At 5-7 days some duplication is unavoidable (only four competition lifts exist), so we
  // only flag genuine junk-duplication. Branches are mutually exclusive by methodology.
  if (methodology === 'plus_set_wave') {
    const seenPairs = new Map<string, number>()
    sessions.forEach((session, index) => {
      const key = `${anchors[index]}::${session.variationMovementId ?? ''}`
      const earlier = seenPairs.get(key)
      if (earlier === undefined) {
        seenPairs.set(key, index)
        return
      }
      issues.push({
        id: `duplicate_main:${index}`,
        check: 'duplicate_main',
        severity: 'warning',
        scope: index,
        message: `Day ${index + 1} repeats Day ${earlier + 1} exactly (same lift and variation). Give one day a different variation so it adds something new.`,
      })
    })
    return issues
  }

  const totals = new Map<string, number>()
  anchors.forEach((anchor) => totals.set(anchor, (totals.get(anchor) ?? 0) + 1))
  const running = new Map<string, number>()
  anchors.forEach((anchor, index) => {
    const next = (running.get(anchor) ?? 0) + 1
    running.set(anchor, next)
    if (next === 3) {
      issues.push({
        id: `duplicate_main:${index}`,
        check: 'duplicate_main',
        severity: 'warning',
        scope: index,
        message: `${getMovementName(anchor)} is trained ${totals.get(anchor) ?? next}× this week — that's a lot of heavy volume on one lift. Make sure recovery keeps up.`,
      })
    }
  })
  return issues
}

function weeklyBalanceIssues(
  sessions: CustomProgramBuilderInput['sessions'],
  anchors: string[],
  catalog: Record<string, Movement>,
): GuidanceIssue[] {
  const issues: GuidanceIssue[] = []
  const mainCategories = sessions.map((session) => catalog[session.mainMovementId]?.category)

  if (!mainCategories.includes('lower')) {
    issues.push({
      id: 'weekly_balance:lower',
      check: 'weekly_balance',
      severity: 'warning',
      scope: 'global',
      message: 'No lower-body main lift this week. Add a squat or deadlift day for balanced strength.',
    })
  }
  if (!mainCategories.includes('upper')) {
    issues.push({
      id: 'weekly_balance:upper',
      check: 'weekly_balance',
      severity: 'warning',
      scope: 'global',
      message: 'No upper-body press this week. Add a bench or overhead press day for balanced strength.',
    })
  }

  const hasHinge =
    anchors.includes('deadlift') ||
    sessions.some((session) => {
      const ids = [session.variationMovementId, ...session.accessories.map((accessory) => accessory.movementId)]
      return ids.some((id) => {
        const category = id ? catalog[id]?.category : undefined
        return category === 'hinge' || category === 'posterior_chain'
      })
    })
  if (!hasHinge) {
    issues.push({
      id: 'weekly_balance:hinge',
      check: 'weekly_balance',
      severity: 'info',
      scope: 'global',
      message: 'No hinge or posterior-chain work this week. A deadlift day or a posterior accessory rounds things out.',
    })
  }

  return issues
}

export function hasBlockingIssue(issues: GuidanceIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'block')
}
