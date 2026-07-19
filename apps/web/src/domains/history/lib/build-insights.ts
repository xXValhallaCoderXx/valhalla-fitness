import type { BodyweightEntry, HistoryDashboard, HistoryInsights, Movement, Sex } from '~/shared/types'
import { buildWeeklyVolumeBuckets, type HistorySessionInput } from '~/domains/history/lib/history'
import { buildLiftE1rmSeries, buildPowerliftingTotal } from '~/domains/history/lib/strength'
import { decorateTotalPoints, nearestBodyweight, resolveStrengthScore } from '~/domains/history/lib/dots'
import { buildConsistency, buildWeeklySessionCounts } from '~/domains/history/lib/consistency'
import { buildCalibration } from '~/domains/history/lib/calibration'
import { buildWeeklyRegionSets } from '~/domains/history/lib/muscle-volume'
import { buildMilestones } from '~/domains/history/lib/milestones'
import { movementCatalog } from '~/domains/movement/lib/movements'

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
  now,
  catalog = movementCatalog,
}: {
  sessions: HistorySessionInput[]
  overview: HistoryDashboard['overview']
  bodyweightEntries: BodyweightEntry[]
  sex: Sex | null
  now: string
  catalog?: Record<string, Movement>
}): HistoryInsights {
  const units = sessions.find((session) => session.units)?.units ?? null
  const firstSessionDate = sessions.length
    ? (sessions[sessions.length - 1].completedAt ?? sessions[sessions.length - 1].scheduledDate)
    : null

  const liftSeries = buildLiftE1rmSeries(sessions, { catalog })
  const totalSeries = decorateTotalPoints(buildPowerliftingTotal(liftSeries, units), bodyweightEntries, sex)
  const latestTotal = totalSeries.length ? totalSeries[totalSeries.length - 1] : null
  // Headline score pairs the best-so-far total with the *current* bodyweight,
  // not the weight logged nearest the total's date — it answers "how strong am
  // I now", while totalSeries carries the historically-paired DOTS trend.
  const currentBodyweight = bodyweightEntries.length
    ? bodyweightEntries[bodyweightEntries.length - 1]
    : nearestBodyweight(bodyweightEntries, now)

  const weeklySessions = buildWeeklySessionCounts(sessions, now)
  const completedReps = sessions
    .flatMap((session) => session.exercises.flatMap((exercise) => exercise.sets))
    .reduce((total, set) => (set.completed && typeof set.actualReps === 'number' ? total + set.actualReps : total), 0)

  return {
    generatedAt: now,
    firstSessionDate,
    units,
    liftSeries,
    totalSeries,
    weeklyVolume: buildWeeklyVolumeBuckets(sessions, undefined, { maxWeeks: null }),
    weeklyRegionSets: buildWeeklyRegionSets(sessions, { catalog }),
    weeklySessions,
    consistency: buildConsistency(weeklySessions),
    calibration: buildCalibration(sessions, now),
    bodyweight: { entries: bodyweightEntries, sex },
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
