import type { BodyweightEntry, Sex } from '@sheetless/domain/account/types'
import type { Unit } from '@sheetless/domain/shared/types'
import type { HistoryDashboard, HistoryInsights } from '@sheetless/domain/history/types'
import type { Movement } from '@sheetless/domain/movement/types'
import { buildWeeklyVolumeBuckets, type HistorySessionInput } from '@sheetless/domain/history/history'
import { buildLiftE1rmSeries, buildPowerliftingTotal } from '@sheetless/domain/history/strength'
import { decorateTotalPoints, nearestBodyweight, resolveStrengthScore } from '@sheetless/domain/history/dots'
import { buildConsistency, buildWeeklySessionCounts } from '@sheetless/domain/history/consistency'
import { buildCalibration } from '@sheetless/domain/history/calibration'
import { buildWeeklyRegionSets } from '@sheetless/domain/history/muscle-volume'
import { buildMilestones } from '@sheetless/domain/history/milestones'
import { movementCatalog } from '@sheetless/domain/movement/movements'
import { calendarDateInTimeZone, resolveIanaTimeZone } from '@sheetless/domain/shared/calendar-date'

/**
 * Assembles the full-range insight payload the client slices by time range.
 * Called alongside buildHistoryDashboard — never inside it — so
 * getProgramOverviewFn (which reuses the dashboard builder for bodyLoad only)
 * never pays this cost. Expects sessions newest-first, as the server fetch
 * returns them.
 */
export function buildHistoryInsights({
  sessions,
  overview,
  bodyweightEntries,
  sex,
  accountUnits = 'kg',
  now,
  today,
  timeZone,
  catalog = movementCatalog,
}: {
  sessions: HistorySessionInput[]
  overview: HistoryDashboard['overview']
  bodyweightEntries: BodyweightEntry[]
  sex: Sex | null
  accountUnits?: Unit
  now: string
  today?: string
  timeZone?: string | null
  catalog?: Record<string, Movement>
}): HistoryInsights {
  const units = sessions.find((session) => session.units)?.units ?? null
  const firstSessionDate = sessions.length
    ? sessions[sessions.length - 1].scheduledDate
    : null
  const resolvedTimeZone = resolveIanaTimeZone(timeZone)
  const accountToday = today ?? calendarDateInTimeZone(new Date(now), resolvedTimeZone)

  const liftSeries = buildLiftE1rmSeries(sessions, { catalog })
  const totalSeries = decorateTotalPoints(buildPowerliftingTotal(liftSeries, units), bodyweightEntries, sex)
  const latestTotal = totalSeries.length ? totalSeries[totalSeries.length - 1] : null
  // Headline score pairs the best-so-far total with the *current* bodyweight,
  // not the weight logged nearest the total's date — it answers "how strong am
  // I now", while totalSeries carries the historically-paired DOTS trend.
  const recordedBodyweight = bodyweightEntries.filter((entry) => entry.recordedOn <= accountToday)
  const currentBodyweight = nearestBodyweight(recordedBodyweight, accountToday)

  const weeklySessions = buildWeeklySessionCounts(sessions, accountToday)
  const completedReps = sessions
    .flatMap((session) => session.exercises.flatMap((exercise) => exercise.sets))
    .reduce((total, set) => (set.completed && typeof set.actualReps === 'number' ? total + set.actualReps : total), 0)

  return {
    generatedAt: now,
    today: accountToday,
    timeZone: resolvedTimeZone,
    firstSessionDate,
    units,
    liftSeries,
    totalSeries,
    weeklyVolume: buildWeeklyVolumeBuckets(sessions, undefined, { maxWeeks: null }),
    weeklyRegionSets: buildWeeklyRegionSets(sessions, { catalog }),
    weeklySessions,
    consistency: buildConsistency(weeklySessions),
    calibration: buildCalibration(sessions, accountToday),
    bodyweight: { entries: bodyweightEntries, sex, units: accountUnits },
    strengthScore: resolveStrengthScore({
      total: latestTotal?.total ?? null,
      totalKg: latestTotal?.totalKg ?? null,
      bodyweightKg: currentBodyweight?.weightKg ?? null,
      sex,
      asOfDate: latestTotal?.date ?? null,
    }),
    milestones: buildMilestones({
      tonnage: overview.completedVolume,
      sessions: overview.completedSessions,
      sets: overview.loggedSets,
      units,
    }),
    lifetime: {
      tonnage: overview.completedVolume,
      sets: overview.loggedSets,
      reps: completedReps,
      sessions: overview.completedSessions,
    },
  }
}
