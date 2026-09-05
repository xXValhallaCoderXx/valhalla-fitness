import type { ProgramInstance } from './types'
import type { ProgramLoadChange, ProgramReturnPeriod, ReturnSettings } from './types/return'
import { expandSessionFromTemplateDefinition } from './template-engine'
import { programLoadChanges, withLoadChanges } from './return-loads'
import { defaultReturnSettings, isReturnActive } from './return-settings'

export function buildReturnPreview(
  program: ProgramInstance,
  options: {
    reduction?: number
    settings?: ReturnSettings
    values?: Record<string, number | null>
    scheduledDate: string
  },
) {
  const definition = program.templateDefinition
  if (!definition) throw new Error('Programme definition unavailable')
  const editing = isReturnActive(program.returnPeriod)
  const settings =
    options.settings ??
    program.returnPeriod?.settings ??
    defaultReturnSettings(definition.daysPerWeek, program.rounding)
  const changes = programLoadChanges(program, editing ? 0 : (options.reduction ?? 0.2)).map(
    (change): ProgramLoadChange => ({
      ...change,
      after: Object.hasOwn(options.values ?? {}, `${change.kind}:${change.key}`)
        ? options.values![`${change.kind}:${change.key}`]
        : editing
          ? change.before
          : change.after,
    }),
  )
  const period: ProgramReturnPeriod = editing
    ? { ...program.returnPeriod!, settings }
    : {
        id: 'preview',
        policyVersion: 1,
        status: 'active',
        startedAt: new Date(`${options.scheduledDate}T00:00:00Z`).toISOString(),
        completedWorkouts: 0,
        settings,
      }
  const total = settings.stages.reduce((sum, stage) => sum + stage.workouts, 0)
  const valid = changes.every(
    (change) =>
      change.after !== null && change.after >= 0 && (change.kind !== 'state' || change.after > 0),
  )
  const previewProgram = valid
    ? { ...withLoadChanges(program, changes), returnPeriod: period }
    : null
  const upcoming = previewProgram
    ? Array.from(
        { length: Math.min(50, Math.max(1, total - period.completedWorkouts + 1)) },
        (_, offset) => {
          const completedWorkouts = period.completedWorkouts + offset
          return expandSessionFromTemplateDefinition(
            {
              ...previewProgram,
              currentWeekIndex: program.currentWeekIndex + offset,
              returnPeriod: {
                ...period,
                completedWorkouts,
                status: completedWorkouts >= total ? 'review' : 'active',
              },
            },
            definition,
            options.scheduledDate,
          )
        },
      )
    : []
  return { settings, changes, upcoming, canApply: valid, editing }
}
