import type { ProgramInstance, ProgressionDecision } from './types'
import type { WorkoutSession } from '../session/types'
import { floorCappedIncrease } from './return-loads'

export function capReturnDecisions(
  session: WorkoutSession,
  program: ProgramInstance,
  decisions: ProgressionDecision[],
) {
  const context = session.returnContext
  if (!context) return decisions
  const eligible = decisions.flatMap((decision): ProgressionDecision[] => {
    const entries = Object.entries(context.slots).filter(
      ([, slot]) =>
        slot.binding?.stateKey === decision.stateKey && slot.movementId === decision.movementId,
    )
    if (entries.length !== 1) return []
    const [slotId, frozen] = entries[0]
    const movement = session.movements.find((item) => (item.slotId ?? item.id) === slotId)
    const binding = frozen.binding!
    if (
      !movement ||
      (movement.performedMovementId ?? movement.movementId) !== frozen.movementId ||
      movement.progressionRuleId !== frozen.progressionRuleId ||
      movement.sets.length !== frozen.targets.length ||
      decision.previousValue !== binding.value ||
      decision.recommendedValue == null ||
      program.stateValues.find((state) => state.key === binding.stateKey)?.value !== binding.value
    )
      return []
    const targets = frozen.targets
    const validPerformance = targets.every((target) => {
      const set = movement.sets.find((item) => item.setIndex === target.setIndex)
      return (
        set?.completed &&
        target.targetLoad != null &&
        set.actualLoad === target.targetLoad &&
        set.targetLoad === target.targetLoad &&
        set.actualReps != null &&
        (set.actualRir != null || set.actualRpe != null)
      )
    })
    if (!validPerformance) return []
    const delta = decision.recommendedValue - binding.value
    if (
      delta > 0 &&
      !targets.every((target) => {
        const set = movement.sets.find((item) => item.setIndex === target.setIndex)!
        const rir = set.actualRir ?? (set.actualRpe != null ? 10 - set.actualRpe : -1)
        return (
          set.actualReps! >= (target.targetReps ?? target.targetRepMin ?? 1) &&
          rir >= (target.targetRir ?? context.minimumRir)
        )
      })
    )
      return []
    const cap = context.caps[binding.stateKey] ?? context.defaultCap
    const increase =
      delta > 0
        ? floorCappedIncrease(delta, cap, program.rounding)
        : delta
    const next = Number((binding.value + increase).toFixed(6))
    const percent = binding.value > 0 ? ((increase / binding.value) * 100).toFixed(1) : '0.0'
    const label = binding.stateType === 'training_max' ? 'Training max' : 'Programme load reference'
    const recommendation =
      increase === 0
        ? `Keep ${binding.value} ${program.units}. Return cap: ${cap} ${program.units}.`
        : `${label}: ${binding.value} → ${next} ${program.units} (${increase > 0 ? '+' : ''}${increase} ${program.units}, ${percent}%).${binding.stateType === 'training_max' ? ' Individual set loads use their prescribed percentages.' : ''}`
    return [
      {
        ...decision,
        stateType: binding.stateType,
        recommendedValue: next,
        recommendation,
        inputSummary: `${decision.inputSummary} Evaluated against ${targets.length} retained sets. Return increase cap: ${cap} ${program.units}.`,
        rationale:
          increase > 0
            ? 'All retained work met the saved loads, reps, and effort. The programme increase is limited by your return cap.'
            : decision.rationale,
      },
    ]
  })
  // Shared anchors may appear more than once. Present one conservative decision per source.
  const byKey = new Map<string, ProgressionDecision>()
  for (const decision of eligible) {
    const previous = byKey.get(decision.stateKey!)
    if (!previous || decision.recommendedValue! < previous.recommendedValue!)
      byKey.set(decision.stateKey!, decision)
  }
  return [...byKey.values()]
}
