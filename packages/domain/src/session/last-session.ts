import type { ExperienceMode } from '@sheetless/domain/account/types'
import type { ProgressionDecision } from '@sheetless/domain/program/types'
import { buildWorkoutSummary, elapsedMinutes } from '@sheetless/domain/history/workout-summary'
import { decisionSubject } from '@sheetless/domain/program/decision-labels'
import { progressionDeltaLabel } from '@sheetless/domain/program/progression-reason'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import { formatWeekdayShortDate } from '@sheetless/domain/shared/dates'
import type { WorkoutSession } from '@sheetless/domain/session/types'

/** One tile in the Last-session trio. `tone` lifts the third tile when something was beaten. */
export type LastSessionTile = {
  label: string
  value: string
  highlight?: boolean
}

export type LastSessionCard = {
  sessionId: string
  title: string
  /** "Thu 6 Aug · 52 min" — the duration half is dropped when the workout was never bracketed. */
  meta: string
  tiles: LastSessionTile[]
  /** Guided: one plain sentence. Full: the technical top-set and pending-decision lines. */
  lines: string[]
  linkLabel: string
}

/**
 * The "Last session" card.
 *
 * Every number comes from `buildWorkoutSummary`, which derives completion, volume and the session
 * best from the session snapshot alone — no extra read. Duration is the *actual* elapsed time
 * rather than `stats.durationMinutes`, which prefers the template's estimate.
 */
export function buildLastSessionCard(
  session: WorkoutSession,
  mode: ExperienceMode,
  pendingDecisions: ProgressionDecision[] = [],
): LastSessionCard {
  const guided = mode === 'guided'
  const summary = buildWorkoutSummary(session)
  const minutes = elapsedMinutes(session)
  const prs = session.prs ?? []

  const meta = [formatWeekdayShortDate(session.scheduledDate), minutes ? `${minutes} min` : null]
    .filter(Boolean)
    .join(' · ')

  const tiles: LastSessionTile[] = [
    {
      label: guided ? 'sets done' : 'sets',
      value: guided
        ? `${summary.completion.completed} of ${summary.completion.planned}`
        : `${summary.completion.completed} / ${summary.completion.planned}`,
    },
    { label: guided ? 'weight moved' : 'tonnage', value: summary.stats.volumeLabel },
    prBestTile(summary.sessionBest, prs.length, guided),
  ]

  return {
    sessionId: session.sessionId,
    title: session.title,
    meta,
    tiles,
    lines: guided
      ? guidedLines(summary, prs.length)
      : fullLines(summary, pendingDecisions, session.units),
    linkLabel: guided ? 'Open session' : 'Review decisions',
  }
}

function prBestTile(
  best: ReturnType<typeof buildWorkoutSummary>['sessionBest'],
  prCount: number,
  guided: boolean,
): LastSessionTile {
  if (guided) {
    return { label: prCount === 1 ? 'new best' : 'new bests', value: String(prCount), highlight: prCount > 0 }
  }
  if (!best) return { label: 'top e1RM', value: '—' }
  // First word only: the tile is a third of a card, and "bench press e1RM · PR" truncates.
  const movement = best.movementName.toLowerCase().split(' ')[0]
  return {
    // `e1rmLabel` is already formatWeight output, so the tile and the trace agree on the number.
    label: prCount ? `${movement} e1RM · PR` : `${movement} e1RM`,
    value: best.e1rmLabel,
    highlight: prCount > 0,
  }
}

function guidedLines(summary: ReturnType<typeof buildWorkoutSummary>, prCount: number): string[] {
  const best = summary.sessionBest
  if (!best) return []
  const opening = `${best.movementName}: ${best.resultLabel}`
  return [prCount > 0 ? `${opening} — a new best of ${best.e1rmLabel}.` : `${opening}.`]
}

function fullLines(
  summary: ReturnType<typeof buildWorkoutSummary>,
  pendingDecisions: ProgressionDecision[],
  units: string,
): string[] {
  const lines: string[] = []
  const best = summary.sessionBest
  if (best) {
    lines.push(
      `Top set ${best.resultLabel}${best.rir == null ? '' : ` @ RIR ${best.rir}`} · e1RM ${best.e1rmLabel}`,
    )
  }
  const decision = pendingDecisions[0]
  if (decision) {
    const from = formatWeight(decision.previousValue ?? null, units)
    const to = formatWeight(decision.recommendedValue ?? null, units)
    const move = from && to ? `${from} → ${to}` : progressionDeltaLabel(decision, units)
    lines.push(`Pending: ${decisionSubject(decision, 'full')} ${move ?? ''} · ${decision.ruleId}`.trim())
  }
  return lines
}
