import { z } from 'zod'
import type { ProgramReturnPeriod, ReturnSettings } from './types/return'

export const returnSettingsSchema = z.object({
  stages: z
    .array(
      z.object({
        workouts: z.number().int().min(1).max(100),
        setFraction: z.number().min(0).max(1),
        setCounts: z.record(z.string().min(1).max(200), z.number().int().min(1).max(100)),
      }),
    )
    .min(1)
    .max(8),
  minimumRir: z.number().min(3).max(10),
  defaultCap: z.number().min(0).max(100),
  caps: z.record(z.string().min(1).max(200), z.number().min(0).max(100)),
})

export function defaultReturnSettings(daysPerWeek: number, rounding: number): ReturnSettings {
  return {
    stages: [0.5, 0.75].map((setFraction) => ({
      workouts: daysPerWeek,
      setFraction,
      setCounts: {},
    })),
    minimumRir: 3,
    defaultCap: rounding,
    caps: {},
  }
}

export function returnStage(period: ProgramReturnPeriod) {
  let remaining = period.completedWorkouts
  for (const [index, stage] of period.settings.stages.entries()) {
    if (remaining < stage.workouts) return { stage, index, workout: remaining + 1 }
    remaining -= stage.workouts
  }
  const index = period.settings.stages.length - 1
  const stage = period.settings.stages[index]
  return { stage, index, workout: stage.workouts }
}

export function isReturnActive(period?: ProgramReturnPeriod | null) {
  return period?.status === 'active' || period?.status === 'review'
}

export function returnProgressLabel(period: ProgramReturnPeriod) {
  if (period.status === 'review') return 'Review your return'
  const { index, workout, stage } = returnStage(period)
  return `Return stage ${index + 1} · workout ${workout} of ${stage.workouts}`
}

export function returnSessionDescription(
  session: import('../session/types').PlannedSession &
    Pick<import('../session/types').WorkoutSession, 'returnRecommendations'>,
) {
  const context = session.returnContext
  if (!context) return null
  const capText = Object.entries(context.caps)
    .map(([key, value]) => `${key.replaceAll('_', ' ')}: ${value} ${session.units}`)
    .join('; ')
  const recommendations = (session.returnRecommendations ?? [])
    .map(
      (decision) =>
        `${session.movements.find((movement) => movement.movementId === decision.movementId)?.movementName ?? 'Programme reference'}: ${decision.recommendation}`,
    )
    .join(' ')
  return `Return stage ${context.stageIndex + 1} · workout ${context.stageWorkout} of ${context.stageWorkouts} · ${session.weekLabel}. Leave at least ${context.minimumRir} reps in reserve. Suggested increases are capped at ${context.defaultCap} ${session.units} per programme reference${capText ? ` (${capText})` : ''}. ${context.review ? 'Review your return in Today or Plan.' : 'The existing programme advances normally.'}${recommendations ? ` Saved recommendation: ${recommendations}` : ''}`
}
