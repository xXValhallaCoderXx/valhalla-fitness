import type { MovementSlot, PlannedSession, SetLog } from '../session/types'
import type { ProgramInstance, ReturnSessionContext } from './types'
import { isReturnActive, returnStage } from './return-settings'

function sourceSignature(set: SetLog) {
  const source = set.sourcePrescription ?? set
  return JSON.stringify([
    'targetLoad' in source && typeof source.targetLoad === 'object' && source.targetLoad !== null
      ? Object.entries(source.targetLoad).sort(([left], [right]) => left.localeCompare(right))
      : (source.targetLoad ?? null),
    source.targetReps ?? null,
    source.targetRepMin ?? null,
    source.targetRepMax ?? null,
    source.targetRir ?? null,
    source.targetRpe ?? null,
    Boolean(source.isTopSet),
    Boolean(source.isAmrap),
    Boolean(source.isBackoff),
    source.label ?? null,
  ])
}

export function selectReturnSets(movement: MovementSlot, fraction: number, count?: number) {
  const sets = movement.sets
  const requested = Math.max(1, count ?? Math.ceil(sets.length * fraction))
  const protectedIndices = new Set<number>()
  sets.forEach((set, index) => {
    if (
      movement.role === 'warmup' ||
      set.isTopSet ||
      set.isAmrap ||
      index === 0 ||
      sourceSignature(set) !== sourceSignature(sets[index - 1])
    ) {
      protectedIndices.add(index)
    }
  })
  const retained = new Set(sets.map((_, index) => index))
  for (const backoffs of [true, false]) {
    for (let index = sets.length - 1; index >= 0 && retained.size > requested; index--) {
      if (!protectedIndices.has(index) && Boolean(sets[index].isBackoff) === backoffs)
        retained.delete(index)
    }
  }
  return {
    sets: sets.filter((_, index) => retained.has(index)),
    minimum: protectedIndices.size,
    requested,
  }
}

export function returnTargetSummary(sets: SetLog[]) {
  const groups: Array<{ text: string; count: number }> = []
  for (const set of sets) {
    const reps =
      set.targetReps ??
      (set.targetRepMin != null
        ? `${set.targetRepMin}–${set.targetRepMax ?? set.targetRepMin}`
        : 'chosen')
    const text = `${reps}${set.isAmrap ? '+' : ''} reps; stop with ${set.targetRir} reps left`
    const previous = groups.at(-1)
    if (previous?.text === text) previous.count++
    else groups.push({ text, count: 1 })
  }
  return groups
    .map((group) => `${group.count > 1 ? `${group.count} × ` : ''}${group.text}`)
    .join(' · ')
}

export function applyReturnPrescription(
  session: PlannedSession,
  program: ProgramInstance,
): PlannedSession {
  const period = program.returnPeriod
  const withCutoff = {
    ...session,
    ...(program.loadOverrides?.length ? { loadOverrideVersion: 1 as const } : {}),
    movements: session.movements.map((movement) => ({
      ...movement,
      ...(program.lastLoadResetAt ? { loadSuggestionCutoff: program.lastLoadResetAt } : {}),
    })),
  }
  if (!period || !isReturnActive(period)) return withCutoff
  const { stage, index, workout } = returnStage(period)
  const slots: ReturnSessionContext['slots'] = {}
  const movements = withCutoff.movements.map((movement) => {
    const slotId = movement.slotId ?? movement.id
    const selected = selectReturnSets(movement, stage.setFraction, stage.setCounts[slotId])
    const sets = selected.sets.map((set) => ({
      ...set,
      targetRir: Math.max(
        period.settings.minimumRir,
        set.targetRir ?? 0,
        set.targetRpe != null ? 10 - set.targetRpe : 0,
      ),
      targetRpe:
        set.targetRpe != null ? Math.min(set.targetRpe, 10 - period.settings.minimumRir) : null,
    }))
    const binding = sets[0]?.sourceBinding
    const unambiguous =
      binding &&
      !movement.modeAdaptation &&
      sets.every(
        (set) =>
          set.targetLoad != null &&
          set.sourceBinding?.stateKey === binding.stateKey &&
          set.sourceBinding.value === binding.value,
      )
    slots[slotId] = {
      movementId: movement.movementId,
      progressionRuleId: movement.progressionRuleId ?? null,
      originalCount: movement.sets.length,
      retainedSourceIndices: sets.map((set) => set.setIndex),
      targets: sets.map(
        ({ completed: _completed, actualLoad: _load, actualReps: _reps, ...target }) => target,
      ),
      binding: unambiguous ? binding : null,
    }
    return {
      ...movement,
      sets,
      targetSummary: `${sets.length} of ${movement.sets.length} sets · ${returnTargetSummary(sets)}`,
    }
  })
  return {
    ...withCutoff,
    movements,
    returnContext: {
      policyVersion: 1,
      periodId: period.id,
      startedAt: period.startedAt,
      completedWorkouts: period.completedWorkouts,
      stageIndex: index,
      stageWorkout: workout,
      stageWorkouts: stage.workouts,
      review: period.status === 'review',
      minimumRir: period.settings.minimumRir,
      defaultCap: period.settings.defaultCap,
      caps: period.settings.caps,
      slots,
    },
  }
}
