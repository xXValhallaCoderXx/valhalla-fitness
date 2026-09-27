import type { RequiredEquipment } from '../movement/types'
import type { ProgramSetupPreviewMovement, ProgramSetupPreviewWeek, ProgramStateType, TemplateSetDefinition } from './types'
import { formatNumber } from '../shared/set-notation'

const STATE_LABELS: Record<ProgramStateType, string> = {
  training_max: 'training max',
  one_rep_max: 'one-rep max',
  working_load: 'working load',
  five_rep_max: 'five-rep max',
  manual: 'starting reference',
}

export type PreviewPrescriptionLine = { count: number; reps: string; load: string; effort: string; kind: string }

/** Generic prescription notation: never computes a personal load from guessed strength values. */
export function previewPrescriptionLines(sets: TemplateSetDefinition[] | undefined): PreviewPrescriptionLine[] {
  const result: PreviewPrescriptionLine[] = []
  for (const set of sets ?? []) {
    const load = set.targetLoad
    const loadText = load?.kind === 'percent_of_state'
      ? `${percent(load.percent)}${load.percentMax != null && load.percentMax !== load.percent ? `–${percent(load.percentMax)}` : ''}% of ${STATE_LABELS[load.stateType]}`
      : load?.kind === 'state' ? STATE_LABELS[load.stateType]
        : load?.kind === 'fixed' ? `Prescribed ${formatNumber(load.kg)} kg`
          : load?.kind === 'user_selected' ? 'Choose the load' : 'Load not specified'
    const reps = set.targetReps != null ? `${set.targetReps}`
      : set.targetRepMin != null && set.targetRepMax != null ? `${set.targetRepMin}–${set.targetRepMax}`
        : set.targetRepMin != null ? `${set.targetRepMin} or more`
          : set.targetRepMax != null ? `Up to ${set.targetRepMax}` : 'Reps not specified'
    const effort = [set.targetRir != null ? `RIR ${set.targetRir}` : '',
      set.targetRpe != null ? `RPE ${set.targetRpe}` : ''].filter(Boolean).join(' · ')
    const line = { count: 1, reps: `${reps}${set.isAmrap ? '+' : ''}`, load: loadText, effort,
      kind: set.isBackoff ? 'Back-off' : set.isTopSet ? 'Top set' : '' }
    const previous = result.at(-1)
    if (previous && previous.reps === line.reps && previous.load === line.load &&
      previous.effort === line.effort && previous.kind === line.kind) previous.count += 1
    else result.push(line)
  }
  return result
}

function percent(value: number) {
  return formatNumber(value > 1.5 ? value : value * 100)
}

export function previewPrescriptionText(line: PreviewPrescriptionLine) {
  return [`${line.count} × ${line.reps}`, line.load, line.effort].filter(Boolean).join(' · ')
}

/** A compact table row only when every set shares a reference; otherwise use full lines. */
export function previewCompactPrescription(sets: TemplateSetDefinition[] | undefined) {
  if (!sets?.length || sets.some((set) => set.isBackoff)) return null
  const first = sets[0]!
  const reference = first.targetLoad
  if (!reference || !['percent_of_state', 'state'].includes(reference.kind)) return null
  if (reference.kind !== 'percent_of_state' && reference.kind !== 'state') return null
  if (sets.some((set) => {
    const load = set.targetLoad
    return !load || load.kind !== reference.kind ||
      ((load.kind === 'percent_of_state' || load.kind === 'state') &&
        (load.stateKey !== reference.stateKey || load.stateType !== reference.stateType))
  })) return null
  const lines = previewPrescriptionLines(sets)
  const loads = sets.map((set) => {
    const load = set.targetLoad!
    return load.kind === 'percent_of_state'
      ? `${percent(load.percent)}${load.percentMax != null && load.percentMax !== load.percent ? `–${percent(load.percentMax)}` : ''}`
      : STATE_LABELS[reference.stateType]
  })
  const identicalReps = lines.length === 1
  const efforts = sets.map((set) => previewPrescriptionLines([set])[0]!.effort)
  const sameEffort = efforts.every((effort) => effort === efforts[0])
  return {
    load: loads.every((load) => load === loads[0]) ? loads[0]! : loads.join(' · '),
    reps: identicalReps ? `${sets.length} × ${lines[0]!.reps}`
      : sets.map((set) => previewPrescriptionLines([set])[0]!.reps).join(', '),
    reference: reference.kind === 'percent_of_state' ? `% of ${STATE_LABELS[reference.stateType]}` : '',
    effort: sameEffort ? efforts[0]! : efforts.map((effort, index) => effort ? `Set ${index + 1}: ${effort}` : '').filter(Boolean).join(' · '),
  }
}

export function previewMainMovement(week: ProgramSetupPreviewWeek): ProgramSetupPreviewMovement | undefined {
  return week.sessions.flatMap((session) => session.movements).find((movement) => movement.role === 'main')
}

const EQUIPMENT_LABELS: Record<RequiredEquipment, string> = {
  barbell: 'Barbell', dumbbells: 'Dumbbells', specialty_bar: 'Specialty bar', rack: 'Rack',
  bench: 'Bench', plates: 'Plates', pull_up_bar: 'Pull-up bar', dip_bars: 'Dip bars', cable: 'Cable station',
  machine: 'Machines', smith_machine: 'Smith machine', landmine: 'Landmine', box: 'Box',
  ab_wheel: 'Ab wheel', sliders: 'Sliders', bodyweight: 'Bodyweight',
}

/** Include every phase's resolved movements; incomplete older responses stay visibly incomplete. */
export function previewEquipment(weeks: ProgramSetupPreviewWeek[]) {
  const movements = weeks.flatMap((week) => week.sessions.flatMap((session) => session.movements))
  const equipment = [...new Set(movements.flatMap((movement) => movement.requiredEquipment ?? []))]
  return {
    labels: equipment.map((item) => EQUIPMENT_LABELS[item]),
    complete: movements.length > 0 && movements.every((movement) => movement.requiredEquipment != null),
  }
}

/** Explain only rules the session evaluator handles, without promising mockup increments or resets. */
export function previewProgressionNotes(weeks: ProgramSetupPreviewWeek[]) {
  const movements = weeks.flatMap((week) => week.sessions.flatMap((session) => session.movements))
  const ruleIds = new Set(movements.filter((movement) => movement.role === 'main').map((movement) => movement.progressionRuleId))
  const notes: string[] = []
  if (ruleIds.has('training_max_band') || ruleIds.has('healthy_531_tm_band')) {
    notes.push('Training-max suggestions use the completed top set’s reps and the reps you had left. Review the suggested change before applying it.')
  }
  if (ruleIds.has('simple_linear_completion')) {
    notes.push('Complete every prescribed set at the target reps and effort to receive a suggested increase to the working load.')
  }
  if (ruleIds.has('plus_set_wave') || ruleIds.has('bullmastiff_plus_set')) {
    notes.push('Extra reps on the plus set determine the suggested increase for the next wave. Without extra reps, the load repeats.')
  }
  if (movements.some((movement) => movement.role === 'accessory' && movement.progressionRuleId === 'accessory_double_progression')) {
    notes.push('For accessories, reach the top of the rep range on every set with the prescribed reps left before adding load.')
  }
  return notes
}
