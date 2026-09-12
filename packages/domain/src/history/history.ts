import type {
  HistoryBestSet,
  HistoryDashboard,
  HistoryMovementSummary,
  HistorySubstitutionSummary,
  HistoryWeeklyVolume,
  MovementHistorySet,
  RecentHistoryEntry,
} from '@sheetless/domain/history/types'
import type { Movement } from '@sheetless/domain/movement/types'
import type { PlannedSession, SubstitutionReason } from '@sheetless/domain/session/types'
import type { MovementRole, Unit } from '@sheetless/domain/shared/types'
import { calculateBodyLoad, type BodyLoadWork } from '@sheetless/domain/history/body-load'
import { getMovementName, movementCatalog } from '@sheetless/domain/movement/movements'
import { e1rm, mround } from '@sheetless/domain/program/progression'
import { externalLoadOrNull, isPositiveLoad } from '@sheetless/domain/shared/load'
import { convertWeight } from '@sheetless/domain/shared/math'

export type HistorySetInput = MovementHistorySet & {
  actualRpe?: number | null
}

export type HistoryExerciseInput = {
  id: string
  plannedMovementId: string
  performedMovementId: string
  performedMovementName: string
  role: MovementRole
  targetSummary?: string | null
  sets: HistorySetInput[]
}

export type HistorySessionInput = {
  id: string
  plannedSessionId: string | null
  title: string
  programTitle?: string | null
  templateId?: string | null
  programInstanceId?: string | null
  scheduledDate: string
  /** When the lifter actually started; null for sessions logged before this was recorded. */
  startedAt?: string | null
  completedAt?: string | null
  timeZone?: string | null
  units?: Unit | null
  weekLabel?: string | null
  /** Global session index from the prescription snapshot; used for phase attribution. */
  weekIndex?: number | null
  hardness?: PlannedSession['hardness'] | null
  equipmentMode?: PlannedSession['equipmentMode']
  estimatedMinutes?: number | null
  movementCount: number
  plannedSetCount: number
  isAdHoc?: boolean
  isFavorite?: boolean
  exercises: HistoryExerciseInput[]
}

export type HistorySubstitutionInput = {
  id: string
  sessionId: string
  plannedMovementId: string
  performedMovementId: string
  reason: SubstitutionReason
  note?: string | null
  createdAt?: string | null
}

type BestSetCandidate = HistoryBestSet & {
  score: number
  completedAt: string | null
}

type HistorySessionOrderKey = Pick<HistorySessionInput, 'id' | 'scheduledDate' | 'completedAt'>

type MovementSummaryCandidate = {
  summary: HistoryMovementSummary
  latestSession: HistorySessionOrderKey
}

type SubstitutionSummaryCandidate = {
  summary: HistorySubstitutionSummary
  session: HistorySessionOrderKey
  createdAt: string | null
}

export function compareHistorySessionsNewestFirst(
  left: HistorySessionOrderKey,
  right: HistorySessionOrderKey,
) {
  const scheduledDateCompare = right.scheduledDate.localeCompare(left.scheduledDate)
  if (scheduledDateCompare !== 0) return scheduledDateCompare
  const completedAtCompare = (right.completedAt ?? '').localeCompare(left.completedAt ?? '')
  if (completedAtCompare !== 0) return completedAtCompare
  return right.id.localeCompare(left.id)
}

export function buildHistoryDashboard({
  sessions,
  substitutions,
  now = new Date(),
  catalog = movementCatalog,
}: {
  sessions: HistorySessionInput[]
  substitutions: HistorySubstitutionInput[]
  now?: Date
  catalog?: Record<string, Movement>
}): HistoryDashboard {
  const orderedSessions = sortHistorySessionsNewestFirst(sessions)
  const allSets = orderedSessions.flatMap((session) => session.exercises.flatMap((exercise) => exercise.sets))
  const completedSets = allSets.filter((set) => set.completed)
  const displayUnits = orderedSessions.find((session) => session.units)?.units ?? null
  const completedVolume = displayUnits
    ? orderedSessions.reduce((total, session) => total + calculateSessionCompletedVolume(session, displayUnits), 0)
    : calculateCompletedVolume(completedSets)
  const movementSummaries = buildMovementSummaries(orderedSessions, catalog, displayUnits)
  const recentSessions = buildRecentHistoryEntries(orderedSessions, displayUnits ?? 'kg')

  return {
    overview: {
      completedSessions: orderedSessions.length,
      loggedSets: completedSets.length,
      completedVolume,
      uniqueMovements: movementSummaries.length,
      latestTrainingDate: orderedSessions[0]?.scheduledDate ?? null,
      units: displayUnits,
    },
    bodyLoad: calculateBodyLoad(toBodyLoadWork(orderedSessions, catalog), { now, catalog }),
    bestSets: rankBestSets(orderedSessions).slice(0, 12),
    movementSummaries,
    weeklyVolume: buildWeeklyVolumeBuckets(orderedSessions, displayUnits),
    substitutions: buildSubstitutionSummaries(substitutions, orderedSessions),
    recentSessions,
  }
}

export function calculateCompletedVolume(sets: Array<Pick<HistorySetInput, 'completed' | 'actualLoad' | 'actualReps'>>) {
  return sets.reduce((total, set) => {
    if (!set.completed || !isPositiveLoad(set.actualLoad) || !hasNumber(set.actualReps)) return total
    return total + set.actualLoad * set.actualReps
  }, 0)
}

export function calculateCompletedVolumeInUnits(
  sets: Array<Pick<HistorySetInput, 'completed' | 'actualLoad' | 'actualReps'>>,
  sourceUnits: Unit,
  targetUnits: Unit,
) {
  return sets.reduce((total, set) => {
    if (!set.completed || !isPositiveLoad(set.actualLoad) || !hasNumber(set.actualReps)) return total
    return total + convertWeight(set.actualLoad, sourceUnits, targetUnits) * set.actualReps
  }, 0)
}

function calculateSessionCompletedVolume(session: HistorySessionInput, displayUnits: Unit) {
  return session.exercises.reduce(
    (total, exercise) => total + calculateCompletedVolumeInUnits(exercise.sets, exerciseUnits(session, displayUnits), displayUnits),
    0,
  )
}

export function rankBestSets(sessions: HistorySessionInput[]): HistoryBestSet[] {
  const byMovement = new Map<string, BestSetCandidate>()
  const fallbackUnits = resolveHistoryDisplayUnits(sessions) ?? 'kg'

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      for (const set of exercise.sets) {
        const candidate = buildBestSetCandidate(session, exercise, set, fallbackUnits)
        if (!candidate) continue
        const existing = byMovement.get(candidate.movementId)
        if (!existing || compareBestSetCandidates(candidate, existing) < 0) {
          byMovement.set(candidate.movementId, candidate)
        }
      }
    }
  }

  return Array.from(byMovement.values())
    .sort(compareBestSetCandidates)
    .map(toHistoryBestSet)
}

function toHistoryBestSet(candidate: BestSetCandidate): HistoryBestSet {
  return {
    id: candidate.id,
    movementId: candidate.movementId,
    movementName: candidate.movementName,
    role: candidate.role,
    type: candidate.type,
    load: candidate.load,
    reps: candidate.reps,
    rir: candidate.rir,
    e1rm: candidate.e1rm,
    volume: candidate.volume,
    sessionId: candidate.sessionId,
    sessionTitle: candidate.sessionTitle,
    performedAt: candidate.performedAt,
    units: candidate.units,
  }
}

export function buildMovementSummaries(
  sessions: HistorySessionInput[],
  catalog: Record<string, Movement> = movementCatalog,
  displayUnits: Unit | null = resolveHistoryDisplayUnits(sessions),
): HistoryMovementSummary[] {
  const orderedSessions = sortHistorySessionsNewestFirst(sessions)
  const bestSetsByMovement = new Map(rankBestSets(sessions).map((set) => [set.movementId, set]))
  const summaries = new Map<string, MovementSummaryCandidate>()

  for (const session of orderedSessions) {
    const performedAt = session.scheduledDate
    for (const exercise of session.exercises) {
      const completedSets = exercise.sets.filter((set) => set.completed)
      if (!completedSets.length) continue
      const movement = catalog[exercise.performedMovementId]
      const existing = summaries.get(exercise.performedMovementId)
      const totalVolume = displayUnits
        ? calculateCompletedVolumeInUnits(completedSets, exerciseUnits(session, displayUnits), displayUnits)
        : calculateCompletedVolume(completedSets)
      const substitutionCount = exercise.plannedMovementId === exercise.performedMovementId ? 0 : 1
      if (existing) {
        existing.summary.totalCompletedSets += completedSets.length
        existing.summary.totalVolume += totalVolume
        existing.summary.substitutionCount += substitutionCount
      } else {
        summaries.set(exercise.performedMovementId, {
          summary: {
            movementId: exercise.performedMovementId,
            movementName: exercise.performedMovementName,
            category: movement?.category ?? 'other',
            lastPerformedAt: performedAt,
            totalCompletedSets: completedSets.length,
            totalVolume,
            substitutionCount,
            bestSet: bestSetsByMovement.get(exercise.performedMovementId) ?? null,
          },
          latestSession: session,
        })
      }
    }
  }

  return Array.from(summaries.values())
    .sort((left, right) => {
      const recencyCompare = compareHistorySessionsNewestFirst(left.latestSession, right.latestSession)
      if (recencyCompare !== 0) return recencyCompare
      const setCountCompare = right.summary.totalCompletedSets - left.summary.totalCompletedSets
      if (setCountCompare !== 0) return setCountCompare
      return left.summary.movementId.localeCompare(right.summary.movementId)
    })
    .slice(0, 40)
    .map((candidate) => candidate.summary)
}

export function buildWeeklyVolumeBuckets(
  sessions: HistorySessionInput[],
  displayUnits: Unit | null = resolveHistoryDisplayUnits(sessions),
  options: { maxWeeks?: number | null } = {},
): HistoryWeeklyVolume[] {
  const { maxWeeks = 8 } = options
  const buckets = new Map<string, HistoryWeeklyVolume>()

  for (const session of sessions) {
    const date = parseDate(session.scheduledDate)
    if (!date) continue
    const weekStart = startOfWeek(date)
    const key = formatDateKey(weekStart)
    const completedSets = session.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.completed)
    const volume = displayUnits
      ? calculateCompletedVolumeInUnits(completedSets, exerciseUnits(session, displayUnits), displayUnits)
      : calculateCompletedVolume(completedSets)
    const isDeload = session.hardness === 'Deload'
    const existing = buckets.get(key)
    if (existing) {
      existing.volume += volume
      existing.completedSets += completedSets.length
      existing.sessionCount += 1
      if (isDeload) existing.isDeload = true
    } else {
      buckets.set(key, {
        weekStart: key,
        weekLabel: formatWeekLabel(weekStart),
        volume,
        completedSets: completedSets.length,
        sessionCount: 1,
        isDeload,
      })
    }
  }

  const sorted = Array.from(buckets.values()).sort((left, right) => left.weekStart.localeCompare(right.weekStart))
  return maxWeeks == null ? sorted : sorted.slice(-maxWeeks)
}

export function buildSubstitutionSummaries(
  substitutions: HistorySubstitutionInput[],
  sessions: HistorySessionInput[],
): HistorySubstitutionSummary[] {
  const sessionsById = new Map(sessions.map((session) => [session.id, session]))
  return substitutions
    .map((substitution): SubstitutionSummaryCandidate | null => {
      const session = sessionsById.get(substitution.sessionId)
      if (!session) return null
      return {
        summary: {
          id: substitution.id,
          sessionId: substitution.sessionId,
          sessionTitle: session.title,
          plannedMovementId: substitution.plannedMovementId,
          plannedMovementName: getMovementName(substitution.plannedMovementId),
          performedMovementId: substitution.performedMovementId,
          performedMovementName: getMovementName(substitution.performedMovementId),
          reason: substitution.reason,
          note: substitution.note,
          performedAt: session.scheduledDate,
        },
        session,
        createdAt: substitution.createdAt ?? null,
      }
    })
    .filter((candidate): candidate is SubstitutionSummaryCandidate => candidate !== null)
    .sort((left, right) => {
      const sessionCompare = compareHistorySessionsNewestFirst(left.session, right.session)
      if (sessionCompare !== 0) return sessionCompare
      const createdAtCompare = (right.createdAt ?? '').localeCompare(left.createdAt ?? '')
      if (createdAtCompare !== 0) return createdAtCompare
      return right.summary.id.localeCompare(left.summary.id)
    })
    .slice(0, 20)
    .map((candidate) => candidate.summary)
}

/**
 * How many sessions the dashboard ships.
 *
 * The ledger pages against this, and `overview.completedSessions` is the true total — so the screen
 * can say "60 of 187" rather than implying the list is everything.
 */
export const RECENT_HISTORY_LIMIT = 60

export function buildRecentHistoryEntries(
  sessions: HistorySessionInput[],
  displayUnits: Unit = 'kg',
): RecentHistoryEntry[] {
  return sortHistorySessionsNewestFirst(sessions).slice(0, RECENT_HISTORY_LIMIT).map((session): RecentHistoryEntry => {
    const completedSetCount = session.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.completed).length
    return {
      id: session.id,
      title: session.title,
      completedAt: session.completedAt,
      scheduledDate: session.scheduledDate,
      timeZone: session.timeZone,
      programTitle: session.programTitle,
      weekLabel: session.weekLabel,
      hardness: session.hardness,
      equipmentMode: session.equipmentMode,
      estimatedMinutes: session.estimatedMinutes,
      movementCount: session.movementCount,
      completedSetCount,
      plannedSetCount: session.plannedSetCount,
      tonnage: Math.round(calculateSessionCompletedVolume(session, displayUnits)),
      durationMinutes: sessionDurationMinutes(session),
      isAdHoc: session.isAdHoc,
      isFavorite: session.isFavorite,
    }
  })
}

/** Wall-clock minutes actually spent, or null when the session has no recorded start. */
function sessionDurationMinutes(session: HistorySessionInput): number | null {
  if (!session.startedAt || !session.completedAt) return null
  const started = new Date(session.startedAt).getTime()
  const finished = new Date(session.completedAt).getTime()
  if (Number.isNaN(started) || Number.isNaN(finished) || finished <= started) return null
  return Math.round((finished - started) / 60000)
}

export function toBodyLoadWork(
  sessions: HistorySessionInput[],
  catalog: Record<string, Movement> = movementCatalog,
): BodyLoadWork[] {
  return sessions.flatMap((session) =>
    session.exercises.map((exercise): BodyLoadWork => {
      const movement = catalog[exercise.performedMovementId]
      return {
        movementId: exercise.performedMovementId,
        movementName: exercise.performedMovementName,
        category: movement?.category,
        role: exercise.role,
        completedSets: exercise.sets.filter((set) => set.completed).length,
        performedAt: session.scheduledDate,
      }
    }),
  )
}

function buildBestSetCandidate(
  session: HistorySessionInput,
  exercise: HistoryExerciseInput,
  set: HistorySetInput,
  fallbackUnits: Unit,
): BestSetCandidate | null {
  if (!set.completed || !hasNumber(set.actualReps)) return null
  const load = externalLoadOrNull(set.actualLoad)
  const volume = load == null ? null : load * set.actualReps
  const estimatedMax = load == null ? null : mround(e1rm(load, set.actualReps, set.actualRir ?? 0), 0.5)
  const type = set.isAmrap ? 'amrap' : set.isTopSet ? 'top_set' : exercise.role === 'accessory' ? 'accessory' : 'volume'
  const normalizedLoad = load == null ? null : convertWeight(load, exerciseUnits(session, fallbackUnits), 'kg')
  const score = normalizedLoad == null ? set.actualReps : e1rm(normalizedLoad, set.actualReps, set.actualRir ?? 0)

  return {
    id: set.id,
    movementId: exercise.performedMovementId,
    movementName: exercise.performedMovementName,
    role: exercise.role,
    type,
    load,
    reps: set.actualReps,
    rir: set.actualRir ?? null,
    e1rm: estimatedMax,
    volume,
    sessionId: session.id,
    sessionTitle: session.title,
    performedAt: session.scheduledDate,
    units: session.units,
    score,
    completedAt: session.completedAt ?? null,
  }
}

function compareBestSetCandidates(left: BestSetCandidate, right: BestSetCandidate) {
  const scoreCompare = right.score - left.score
  if (scoreCompare !== 0) return scoreCompare
  const scheduledDateCompare = (right.performedAt ?? '').localeCompare(left.performedAt ?? '')
  if (scheduledDateCompare !== 0) return scheduledDateCompare
  const completedAtCompare = (right.completedAt ?? '').localeCompare(left.completedAt ?? '')
  if (completedAtCompare !== 0) return completedAtCompare
  const sessionIdCompare = right.sessionId.localeCompare(left.sessionId)
  if (sessionIdCompare !== 0) return sessionIdCompare
  return right.id.localeCompare(left.id)
}

function sortHistorySessionsNewestFirst(sessions: HistorySessionInput[]) {
  return [...sessions].sort(compareHistorySessionsNewestFirst)
}

function resolveHistoryDisplayUnits(sessions: HistorySessionInput[]): Unit | null {
  return sortHistorySessionsNewestFirst(sessions).find((session) => session.units)?.units ?? null
}

function hasNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function exerciseUnits(session: HistorySessionInput, fallback: Unit): Unit {
  return session.units ?? fallback
}

export function parseDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function startOfWeek(date: Date) {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = copy.getUTCDay()
  const delta = day === 0 ? -6 : 1 - day
  copy.setUTCDate(copy.getUTCDate() + delta)
  return copy
}

export function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function formatWeekLabel(date: Date) {
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getUTCMonth()]
  return `${month} ${date.getUTCDate()}`
}
