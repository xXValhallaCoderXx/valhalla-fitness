import { e1rm, mround } from '~/shared/lib/math'
import { formatWeight } from '~/shared/lib/set-notation'
import type { PrKind, SessionPr, SetLog, Unit, WorkoutSession } from '~/shared/types'

/** One prior completed working set, reduced to what PR detection needs. */
export type PriorSetSample = { load: number; reps: number; rir: number | null }

export type PriorBests = {
  maxLoad: number
  maxE1rm: number
  /** Max reps ever logged at an exact load; key = loadKey(load). */
  repsAtLoad: Record<string, number>
  sampleCount: number
}

/** Loads compare as fixed-precision strings so 82.5 matches 82.50 (float-safe). */
export const loadKey = (load: number) => load.toFixed(2)

export function buildPriorBests(sets: PriorSetSample[]): PriorBests {
  const bests: PriorBests = { maxLoad: 0, maxE1rm: 0, repsAtLoad: {}, sampleCount: 0 }
  for (const set of sets) {
    if (!(set.load > 0) || !(set.reps > 0)) continue
    bests.sampleCount += 1
    bests.maxLoad = Math.max(bests.maxLoad, set.load)
    bests.maxE1rm = Math.max(bests.maxE1rm, e1rm(set.load, set.reps, set.rir ?? 0))
    const key = loadKey(set.load)
    bests.repsAtLoad[key] = Math.max(bests.repsAtLoad[key] ?? 0, set.reps)
  }
  return bests
}

const PR_KIND_ORDER: PrKind[] = ['heaviest_weight', 'best_e1rm', 'rep_record']

export const prKindLabels: Record<PrKind, string> = {
  heaviest_weight: 'Heaviest weight yet',
  best_e1rm: 'New estimated max',
  rep_record: 'Most reps at this weight',
}

export const prBannerTitle = 'New personal best 🎉'

type PrCandidateSet = SetLog & { actualLoad: number; actualReps: number }

function prCandidateSets(sets: SetLog[]): PrCandidateSet[] {
  return sets.filter(
    (set): set is PrCandidateSet =>
      set.completed &&
      typeof set.actualLoad === 'number' &&
      Number.isFinite(set.actualLoad) &&
      set.actualLoad > 0 &&
      typeof set.actualReps === 'number' &&
      set.actualReps > 0,
  )
}

function candidateE1rm(set: PrCandidateSet) {
  return e1rm(set.actualLoad, set.actualReps, set.actualRir ?? 0)
}

/**
 * Compare this session's completed sets against each movement's prior bests
 * (which must already exclude the current session). Movements never trained
 * before fire no PR — "first time" records are noise, not celebration.
 * Slots performing the same movement are merged so a repeated exercise can't
 * celebrate the same record twice.
 */
export function detectSessionPrs(
  session: WorkoutSession,
  priorByMovement: Record<string, PriorBests>,
): SessionPr[] {
  const byMovement = new Map<string, { movementName: string; sets: SetLog[] }>()
  for (const movement of session.movements) {
    const movementId = movement.performedMovementId ?? movement.movementId
    const entry = byMovement.get(movementId) ?? {
      movementName: movement.performedMovementName ?? movement.movementName,
      sets: [],
    }
    entry.sets.push(...movement.sets)
    byMovement.set(movementId, entry)
  }

  const prs: SessionPr[] = []
  for (const [movementId, movement] of byMovement) {
    const prior = priorByMovement[movementId]
    if (!prior || prior.sampleCount === 0) continue

    const candidates = prCandidateSets(movement.sets)
    if (!candidates.length) continue

    const kinds: PrKind[] = []
    const heaviest = candidates.reduce((best, set) =>
      set.actualLoad > best.actualLoad ||
      (set.actualLoad === best.actualLoad && set.actualReps > best.actualReps)
        ? set
        : best,
    )
    if (heaviest.actualLoad > prior.maxLoad) kinds.push('heaviest_weight')

    const headline = candidates.reduce((best, set) => (candidateE1rm(set) > candidateE1rm(best) ? set : best))
    if (candidateE1rm(headline) > prior.maxE1rm) kinds.push('best_e1rm')

    // A rep record at a brand-new weight is just the weight PR — only count
    // rep records when the weight itself isn't already a record. Of the sets
    // that broke a record, freeze the best one, not the first logged.
    const repRecordCandidates = kinds.includes('heaviest_weight')
      ? []
      : candidates.filter((set) => {
          const priorReps = prior.repsAtLoad[loadKey(set.actualLoad)]
          return priorReps !== undefined && set.actualReps > priorReps
        })
    const repRecord = repRecordCandidates.length
      ? repRecordCandidates.reduce((best, set) => (set.actualReps > best.actualReps ? set : best))
      : null
    if (repRecord) kinds.push('rep_record')

    if (!kinds.length) continue
    kinds.sort((left, right) => PR_KIND_ORDER.indexOf(left) - PR_KIND_ORDER.indexOf(right))

    const displaySet = kinds[0] === 'heaviest_weight' ? heaviest : kinds[0] === 'best_e1rm' ? headline : repRecord!
    prs.push({
      movementId,
      movementName: movement.movementName,
      kinds,
      load: displaySet.actualLoad,
      reps: displaySet.actualReps,
      // Always the session's best estimate for this movement — the display set
      // can be a different (heavier, lower-e1RM) set than the one that broke
      // the estimated-max record.
      e1rm: mround(candidateE1rm(headline), 0.5),
      previousLabel: previousBestLabel(kinds[0], displaySet, prior, session.units),
    })
  }
  return prs
}

function previousBestLabel(kind: PrKind, set: PrCandidateSet, prior: PriorBests, units: Unit): string | null {
  if (kind === 'heaviest_weight') {
    const priorReps = prior.repsAtLoad[loadKey(prior.maxLoad)]
    return priorReps === undefined
      ? `Old best: ${formatWeight(prior.maxLoad, units)}`
      : `Old best: ${formatWeight(prior.maxLoad, units)} × ${priorReps}`
  }
  if (kind === 'best_e1rm') {
    return `Old estimated max: ${formatWeight(mround(prior.maxE1rm, 0.5), units)}`
  }
  const priorReps = prior.repsAtLoad[loadKey(set.actualLoad)]
  return priorReps === undefined ? null : `Old best at ${formatWeight(set.actualLoad, units)}: ${priorReps} reps`
}
