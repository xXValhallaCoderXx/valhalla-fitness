import type { MovementSlot, SetLog, WorkoutSession } from '@sheetless/domain/session/types/session'
import { buildLoadTrace } from '@sheetless/domain/program/load-trace'
import { percentOf } from '@sheetless/domain/program/return-loads'
import { formatNumber } from '@sheetless/domain/shared/set-notation'
import type { SetInput } from '@sheetless/domain/session/set-draft'

export function confirmed(set: SetLog) {
  return set.completed && set.syncState !== 'saving' && set.syncState !== 'syncFailed'
}

export function setLogLabel(label: string, input: SetInput, units: string) {
  return label === 'Log set' ? `Log ${setInputLabel(input, units)}` : label
}

export function setInputLabel(input: SetInput, units: string) {
  return `${input.load || '—'} ${units} × ${input.reps || '—'}`
}

export function focusValueFontSize(value: string, viewportWidth: number, fontScale: number, hasUnit = false) {
  const available = Math.max(120, Math.min(308, viewportWidth - 32) * 0.76 - (hasUnit ? 30 * fontScale : 0))
  return Math.max(20, Math.min(64, available / (Math.max(2, value.length) * 0.65 * Math.max(1, fontScale))))
}

/** Only show a source percentage when it reproduces the saved prescription. */
export function workoutSetDetail(set: SetLog, movement: MovementSlot, session: WorkoutSession, advanced: boolean) {
  if (set.syncState === 'saving') return 'Saving…'
  if (set.syncState === 'syncFailed') return 'Save failed · retry'
  if (confirmed(set) && !advanced) {
    const sameReps = set.targetReps != null ? set.actualReps === set.targetReps
      : set.targetRepMin != null && set.targetRepMax != null && set.actualReps != null
        && set.actualReps >= set.targetRepMin && set.actualReps <= set.targetRepMax
    return set.actualLoad === set.targetLoad && sameReps ? 'as planned' : 'logged'
  }
  const rir = confirmed(set) ? set.actualRir : set.targetRir
  const parts: string[] = []
  const source = set.sourcePrescription?.targetLoad
  if (advanced && source?.kind === 'percent_of_state' && (!confirmed(set) || set.actualLoad === set.targetLoad)
    && buildLoadTrace({ set, movement, session })?.matchesPlannedLoad) parts.push(`${formatNumber(percentOf(source) * 100)}%`)
  if (rir != null) parts.push(advanced ? `RIR ${formatNumber(rir)}` : `Leave about ${formatNumber(rir)} reps in the tank`)
  if (set.isAmrap && !confirmed(set)) parts.push('as many as you can')
  return parts.join(' · ')
}

/** Radius and gaps stay stable for one set, many sets and a countdown circle. */
export function setRingArcs(count: number) {
  if (!Number.isInteger(count) || count <= 0) return []
  const sweep = 360 / count
  const gap = Math.min(12, sweep / 4)
  const point = (angle: number) => {
    const radians = (angle - 90) * Math.PI / 180
    return [120 + 110 * Math.cos(radians), 120 + 110 * Math.sin(radians)]
  }
  return Array.from({ length: count }, (_, index) => {
    const start = point(index * sweep + gap / 2)
    const end = point((index + 1) * sweep - gap / 2)
    return `M ${start[0]} ${start[1]} A 110 110 0 ${sweep - gap > 180 ? 1 : 0} 1 ${end[0]} ${end[1]}`
  })
}
