import type { ProgramInstance } from './types'
import type { WorkoutSession } from '../session/types'
import type { buildReturnPreview } from './return-preview'
import { withLoadChanges } from './return-loads'
import { expandSessionFromTemplateDefinition } from './template-engine'
import { buildProgressionDecisionsForSession } from './progression-decisions'

export type ReturnBaseline = {
  movementId: string
  slotId: string
  load: number
  reps: number
  date: string
}
export type ReturnLiftOutlook = {
  key: string
  movementId: string
  name: string
  slotIds: string[]
  reference: { key: string; label: string; before: number; after: number } | null
  lastWork: ReturnBaseline | null
  goalKind: 'last_workout' | 'reference' | 'manual'
  goalLoad: number | null
  goalReps: number | null
  workouts: number | null
}
export type ReturnOutlook = {
  daysPerWeek: number
  horizonWeeks: number
  lifts: ReturnLiftOutlook[]
  weeks: Array<{
    number: number
    phases: string[]
    setPercentages: number[]
    referencePercentRange: [number, number] | null
  }>
  reviewAfter: number
  totalWorkouts: number | null
  hasPlusSets: boolean
}

const referenceLabel = (type: string) =>
  type === 'training_max'
    ? 'Training max'
    : type === 'working_load'
      ? 'Working load'
      : 'Load reference'

/** A conditional scenario using the actual workout generator and capped progression rules. */
export function buildReturnOutlook(
  program: ProgramInstance,
  preview: ReturnType<typeof buildReturnPreview>,
  baseline: ReturnBaseline[] = [],
): ReturnOutlook {
  const definition = program.templateDefinition!
  const daysPerWeek = definition.daysPerWeek
  const total = preview.settings.stages.reduce((sum, stage) => sum + stage.workouts, 0)
  const progress = preview.editing ? program.returnPeriod!.completedWorkouts : 0
  const result: ReturnOutlook = {
    daysPerWeek,
    horizonWeeks: 52,
    lifts: [],
    weeks: [],
    reviewAfter: Math.max(0, total - progress),
    totalWorkouts: null,
    hasPlusSets: false,
  }
  if (!preview.canApply || !preview.upcoming.length) return result
  let projected: ProgramInstance = {
    ...withLoadChanges(program, preview.changes),
    returnPeriod: {
      id: 'outlook',
      policyVersion: 1,
      status: 'active',
      startedAt: '2000-01-01T00:00:00Z',
      completedWorkouts: progress,
      settings: preview.settings,
    },
  }
  const originalReset = preview.editing
    ? program.loadAdjustments?.find(
        (adjustment) => adjustment.createdAt === program.returnPeriod!.startedAt,
      )
    : null
  const lifts = new Map<string, ReturnLiftOutlook>()
  // Discover phase-dependent main lifts without exposing all individual prescriptions in the UI.
  for (let offset = 0; offset < definition.weeks.length * daysPerWeek; offset++) {
    const session = expandSessionFromTemplateDefinition(
      { ...projected, currentWeekIndex: program.currentWeekIndex + offset },
      definition,
      '2000-01-01',
    )
    for (const movement of session.movements.filter((item) => item.role === 'main')) {
      const binding = session.returnContext?.slots[movement.slotId ?? movement.id]?.binding
      const key = `${movement.movementId}:${binding?.stateKey ?? 'manual'}`
      const slotId = movement.slotId ?? movement.id
      const existing = lifts.get(key)
      if (existing) {
        if (!existing.slotIds.includes(slotId)) existing.slotIds.push(slotId)
        continue
      }
      const change =
        binding &&
        preview.changes.find((item) => item.kind === 'state' && item.key === binding.stateKey)
      const previous =
        change &&
        (originalReset?.changes.find((item) => item.kind === 'state' && item.key === change.key)
          ?.before ??
          change.before)
      const lastWork =
        baseline
          .filter((item) => item.movementId === movement.movementId && item.slotId === slotId)
          .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
      const reference =
        binding && change && previous != null
          ? {
              key: binding.stateKey,
              label: referenceLabel(binding.stateType),
              before: previous,
              after: change.after!,
            }
          : null
      lifts.set(key, {
        key,
        movementId: movement.movementId,
        name: movement.movementName,
        slotIds: [slotId],
        reference,
        lastWork,
        goalKind: lastWork ? 'last_workout' : reference ? 'reference' : 'manual',
        goalLoad: lastWork?.load ?? reference?.before ?? null,
        goalReps: lastWork?.reps ?? null,
        workouts: !lastWork && reference && reference.after >= reference.before ? 0 : null,
      })
    }
  }
  result.lifts = [...lifts.values()]
  for (const lift of result.lifts) {
    const lastWork = baseline
      .filter((item) => item.movementId === lift.movementId && lift.slotIds.includes(item.slotId))
      .sort((a, b) => b.date.localeCompare(a.date))[0]
    if (lastWork)
      Object.assign(lift, {
        lastWork,
        goalKind: 'last_workout',
        goalLoad: lastWork.load,
        goalReps: lastWork.reps,
        workouts: null,
      })
  }
  for (let offset = 0; offset < result.horizonWeeks * daysPerWeek; offset++) {
    const session = expandSessionFromTemplateDefinition(projected, definition, '2000-01-01')
    const simulation: WorkoutSession = {
      ...session,
      sessionId: 'outlook',
      stateVersion: 0,
      status: 'in_progress',
      movements: session.movements.map((movement) => ({
        ...movement,
        sets: movement.sets.map((set) => {
          const plus =
            set.isAmrap ||
            (set.isTopSet &&
              ['plus_set_wave', 'bullmastiff_plus_set'].includes(movement.progressionRuleId ?? ''))
          if (plus) result.hasPlusSets = true
          return {
            ...set,
            completed: set.targetLoad != null,
            actualLoad: set.targetLoad,
            actualReps: (set.targetReps ?? set.targetRepMin ?? 1) + (plus ? 2 : 0),
            actualRir: set.targetRir ?? preview.settings.minimumRir,
          }
        }),
      })),
    }
    for (const lift of result.lifts) {
      if (lift.workouts !== null || lift.goalLoad === null) continue
      const movement = simulation.movements.find(
        (item) =>
          item.movementId === lift.movementId &&
          (lift.lastWork
            ? lift.lastWork.slotId === (item.slotId ?? item.id)
            : lift.slotIds.includes(item.slotId ?? item.id)),
      )
      if (!movement) continue
      const reached =
        lift.goalKind === 'reference'
          ? projected.stateValues.find((state) => state.key === lift.reference?.key)?.value! >=
            lift.goalLoad
          : movement.sets.some(
              (set) =>
                set.actualLoad != null &&
                set.actualLoad >= lift.goalLoad! &&
                set.actualReps! >= lift.goalReps!,
            )
      if (reached) lift.workouts = offset + 1
    }
    if (offset < daysPerWeek * 2) {
      const number = Math.floor(offset / daysPerWeek) + 1
      const week = result.weeks[number - 1] ?? {
        number,
        phases: [],
        setPercentages: [],
        referencePercentRange: null,
      }
      if (session.phaseLabel && !week.phases.includes(session.phaseLabel))
        week.phases.push(session.phaseLabel)
      const stage = preview.settings.stages[session.returnContext!.stageIndex]
      if (!week.setPercentages.includes(stage.setFraction * 100))
        week.setPercentages.push(stage.setFraction * 100)
      const percentages = result.lifts.flatMap((lift) => {
        if (!lift.reference || lift.reference.before <= 0) return []
        const current = projected.stateValues.find(
          (state) => state.key === lift.reference!.key,
        )?.value
        return current == null ? [] : [Math.round((current / lift.reference.before) * 100)]
      })
      if (percentages.length) {
        const previous = week.referencePercentRange ?? []
        week.referencePercentRange = [
          Math.min(...percentages, ...previous),
          Math.max(...percentages, ...previous),
        ]
      }
      result.weeks[number - 1] = week
    }
    if (offset >= daysPerWeek * 2 - 1 && result.lifts.every((lift) => lift.workouts !== null)) break
    const decisions = buildProgressionDecisionsForSession(simulation, projected)
    projected = {
      ...projected,
      currentWeekIndex: projected.currentWeekIndex + 1,
      stateValues: projected.stateValues.map((state) => ({
        ...state,
        value:
          decisions.find((decision) => decision.stateKey === state.key)?.recommendedValue ??
          state.value,
      })),
      returnPeriod: {
        ...projected.returnPeriod!,
        completedWorkouts: progress + offset + 1,
        status: progress + offset + 1 >= total ? 'review' : 'active',
      },
    }
  }
  result.totalWorkouts =
    result.lifts.length && result.lifts.every((lift) => lift.workouts !== null)
      ? Math.max(...result.lifts.map((lift) => lift.workouts!))
      : null
  return result
}

export function returnEstimateLabel(workouts: number | null, daysPerWeek: number) {
  if (workouts === null) return 'Timing depends on your progress'
  if (workouts === 0) return 'Already at this reference'
  const weeks = Math.ceil(workouts / daysPerWeek)
  return weeks === 1 ? 'About 1 week' : `About ${weeks} weeks`
}
