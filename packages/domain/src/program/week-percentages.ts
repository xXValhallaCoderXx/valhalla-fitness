import type {
  TemplateDefinition,
  TemplateSetDefinition,
  TemplateWeekDefinition,
} from '@sheetless/domain/program/types'

/**
 * A week's main-lift prescription as percentages, for Plan's Full week strip.
 *
 * "65 · 75 · 85 % × 5 · 5 · 5+" — the percentages run together, then the reps, because that is how
 * the wave is read aloud. Back-off sets are excluded: they repeat one percentage many times and
 * would swamp the cell, and the week's hardness token already says the week is heavy.
 *
 * Returns null when the week's main lift is not percentage-driven (a fixed or user-selected load
 * has no percentage to show) — the caller falls back to the authored `targetSummary`.
 */
export function formatWeekPercentages(
  definition: Pick<TemplateDefinition, 'sessions'>,
  week: Pick<TemplateWeekDefinition, 'prescriptions'>,
): string | null {
  const sets = mainWorkingSets(definition, week)
  if (!sets.length) return null

  const steps: Array<{ percent: string; reps: string; count: number }> = []
  for (const set of sets) {
    const load = set.targetLoad
    if (load?.kind !== 'percent_of_state') return null
    // A ramp's top set can carry a range; the strip shows the number the lifter works to.
    const percent = load.default === 'high' && load.percentMax ? load.percentMax : load.percent
    const step = { percent: trimNumber(percent * 100), reps: `${repLabel(set) ?? '—'}${set.isAmrap ? '+' : ''}` }
    const last = steps[steps.length - 1]
    if (last && last.percent === step.percent && last.reps === step.reps) last.count += 1
    else steps.push({ ...step, count: 1 })
  }
  if (!steps.length) return null

  // A pure ramp — every step distinct — reads best the way the comp writes it: percentages
  // together, then reps. A block of identical sets does not; "70 · 70 · 70 · 70 %" is four times
  // the width for none of the information, so runs collapse to "4 × 70 % × 6" instead.
  const isRamp = steps.every((step) => step.count === 1)
  if (isRamp) {
    return `${steps.map((step) => step.percent).join(' · ')} % × ${steps.map((step) => step.reps).join(' · ')}`
  }

  return steps
    .map((step) => (step.count > 1 ? `${step.count} × ${step.percent} % × ${step.reps}` : `${step.percent} % × ${step.reps}`))
    .join(' · ')
}

/** The main slot's sets for this week, in template order, back-offs removed. */
function mainWorkingSets(
  definition: Pick<TemplateDefinition, 'sessions'>,
  week: Pick<TemplateWeekDefinition, 'prescriptions'>,
): TemplateSetDefinition[] {
  for (const session of definition.sessions) {
    const mainSlot = session.slots.find((slot) => slot.role === 'main')
    if (!mainSlot) continue
    const prescription = week.prescriptions[mainSlot.prescriptionId]
    if (!prescription) continue
    const working = prescription.sets.filter((set) => !set.isBackoff)
    if (working.length) return working
  }
  return []
}

function repLabel(set: TemplateSetDefinition): string | null {
  if (set.targetReps !== undefined) return String(set.targetReps)
  if (set.targetRepMin !== undefined && set.targetRepMax !== undefined) {
    return `${set.targetRepMin}–${set.targetRepMax}`
  }
  return set.targetRepMin !== undefined ? String(set.targetRepMin) : null
}

function trimNumber(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return String(Number(value.toFixed(4)))
}
