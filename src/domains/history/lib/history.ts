import type {
  HistoryBestSet,
  HistoryDashboard,
  HistoryMovementSummary,
  HistorySubstitutionSummary,
  HistoryWeeklyVolume,
  Movement,
  MovementHistorySet,
  MovementRole,
  PlannedSession,
  RecentHistoryEntry,
  SubstitutionReason,
  Unit,
} from '~/shared/types'
import { calculateBodyLoad, type BodyLoadWork } from '~/domains/history/lib/body-load'
import { getMovementName, movementCatalog } from '~/domains/movement/lib/movements'
import { e1rm, mround } from '~/domains/program/lib/progression'
import { convertWeight } from '~/shared/lib/math'

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
  completedAt?: string | null
  units?: Unit | null
  weekLabel?: string | null
  /** Global session index from the prescription snapshot; used for phase attribution. */
  weekIndex?: number | null
  hardness?: PlannedSession['hardness'] | null
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
  const allSets = sessions.flatMap((session) => session.exercises.flatMap((exercise) => exercise.sets))
  const completedSets = allSets.filter((set) => set.completed)
  const displayUnits = sessions.find((session) => session.units)?.units ?? null
  const completedVolume = displayUnits
    ? sessions.reduce((total, session) => total + calculateSessionCompletedVolume(session, displayUnits), 0)
    : calculateCompletedVolume(completedSets)
  const movementSummaries = buildMovementSummaries(sessions, catalog, displayUnits)
  const recentSessions = buildRecentHistoryEntries(sessions)

  return {
    overview: {
      completedSessions: sessions.length,
      loggedSets: completedSets.length,
      completedVolume,
      uniqueMovements: movementSummaries.length,
      latestTrainingDate: sessions[0]?.completedAt ?? sessions[0]?.scheduledDate ?? null,
      units: displayUnits,
    },
    bodyLoad: calculateBodyLoad(toBodyLoadWork(sessions, catalog), { now, catalog }),
    bestSets: rankBestSets(sessions).slice(0, 12),
    movementSummaries,
    weeklyVolume: buildWeeklyVolumeBuckets(sessions, displayUnits),
    substitutions: buildSubstitutionSummaries(substitutions, sessions),
    recentSessions,
  }
}

export function calculateCompletedVolume(sets: Array<Pick<HistorySetInput, 'completed' | 'actualLoad' | 'actualReps'>>) {
  return sets.reduce((total, set) => {
    if (!set.completed || !hasNumber(set.actualLoad) || !hasNumber(set.actualReps)) return total
    return total + set.actualLoad * set.actualReps
  }, 0)
}

export function calculateCompletedVolumeInUnits(
  sets: Array<Pick<HistorySetInput, 'completed' | 'actualLoad' | 'actualReps'>>,
  sourceUnits: Unit,
  targetUnits: Unit,
) {
  return sets.reduce((total, set) => {
    if (!set.completed || !hasNumber(set.actualLoad) || !hasNumber(set.actualReps)) return total
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

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      for (const set of exercise.sets) {
        const candidate = buildBestSetCandidate(session, exercise, set)
        if (!candidate) continue
        const existing = byMovement.get(candidate.movementId)
        if (!existing || candidate.score > existing.score) {
          byMovement.set(candidate.movementId, candidate)
        }
      }
    }
  }

  return Array.from(byMovement.values())
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      return (right.performedAt ?? '').localeCompare(left.performedAt ?? '')
    })
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
  displayUnits: Unit | null = sessions.find((session) => session.units)?.units ?? null,
): HistoryMovementSummary[] {
  const bestSetsByMovement = new Map(rankBestSets(sessions).map((set) => [set.movementId, set]))
  const summaries = new Map<string, HistoryMovementSummary>()

  for (const session of sessions) {
    const performedAt = session.completedAt ?? session.scheduledDate
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
        existing.totalCompletedSets += completedSets.length
        existing.totalVolume += totalVolume
        existing.substitutionCount += substitutionCount
        if (!existing.lastPerformedAt || performedAt.localeCompare(existing.lastPerformedAt) > 0) {
          existing.lastPerformedAt = performedAt
        }
      } else {
        summaries.set(exercise.performedMovementId, {
          movementId: exercise.performedMovementId,
          movementName: exercise.performedMovementName,
          category: movement?.category ?? 'other',
          lastPerformedAt: performedAt,
          totalCompletedSets: completedSets.length,
          totalVolume,
          substitutionCount,
          bestSet: bestSetsByMovement.get(exercise.performedMovementId) ?? null,
        })
      }
    }
  }

  return Array.from(summaries.values())
    .sort((left, right) => {
      const dateCompare = (right.lastPerformedAt ?? '').localeCompare(left.lastPerformedAt ?? '')
      if (dateCompare !== 0) return dateCompare
      return right.totalCompletedSets - left.totalCompletedSets
    })
    .slice(0, 40)
}

export function buildWeeklyVolumeBuckets(
  sessions: HistorySessionInput[],
  displayUnits: Unit | null = sessions.find((session) => session.units)?.units ?? null,
  options: { maxWeeks?: number | null } = {},
): HistoryWeeklyVolume[] {
  const { maxWeeks = 8 } = options
  const buckets = new Map<string, HistoryWeeklyVolume>()

  for (const session of sessions) {
    const date = parseDate(session.completedAt ?? session.scheduledDate)
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
    .map((substitution): HistorySubstitutionSummary | null => {
      const session = sessionsById.get(substitution.sessionId)
      if (!session) return null
      return {
        id: substitution.id,
        sessionId: substitution.sessionId,
        sessionTitle: session.title,
        plannedMovementId: substitution.plannedMovementId,
        plannedMovementName: getMovementName(substitution.plannedMovementId),
        performedMovementId: substitution.performedMovementId,
        performedMovementName: getMovementName(substitution.performedMovementId),
        reason: substitution.reason,
        note: substitution.note,
        performedAt: session.completedAt ?? session.scheduledDate ?? substitution.createdAt ?? null,
      }
    })
    .filter((summary): summary is HistorySubstitutionSummary => summary !== null)
    .sort((left, right) => (right.performedAt ?? '').localeCompare(left.performedAt ?? ''))
    .slice(0, 20)
}

export function buildRecentHistoryEntries(sessions: HistorySessionInput[]): RecentHistoryEntry[] {
  return sessions.slice(0, 20).map((session): RecentHistoryEntry => {
    const completedSetCount = session.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.completed).length
    return {
      id: session.id,
      title: session.title,
      completedAt: session.completedAt,
      scheduledDate: session.scheduledDate,
      programTitle: session.programTitle,
      weekLabel: session.weekLabel,
      hardness: session.hardness,
      estimatedMinutes: session.estimatedMinutes,
      movementCount: session.movementCount,
      completedSetCount,
      plannedSetCount: session.plannedSetCount,
      isAdHoc: session.isAdHoc,
      isFavorite: session.isFavorite,
    }
  })
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
        performedAt: session.completedAt ?? session.scheduledDate,
      }
    }),
  )
}

function buildBestSetCandidate(
  session: HistorySessionInput,
  exercise: HistoryExerciseInput,
  set: HistorySetInput,
): BestSetCandidate | null {
  if (!set.completed || !hasNumber(set.actualReps)) return null
  const load = hasNumber(set.actualLoad) ? set.actualLoad : null
  const volume = hasNumber(load) ? load * set.actualReps : null
  const estimatedMax = hasNumber(load) ? mround(e1rm(load, set.actualReps, set.actualRir ?? 0), 0.5) : null
  const type = set.isAmrap ? 'amrap' : set.isTopSet ? 'top_set' : exercise.role === 'accessory' ? 'accessory' : 'volume'
  const score = estimatedMax ?? volume ?? set.actualReps

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
    performedAt: session.completedAt ?? session.scheduledDate,
    units: session.units,
    score,
  }
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
