import type { ProgramSetupPreviewMovement, ProgramSetupPreviewWeek } from '~/shared/types'
import { compactWeekPreviewOptions } from '~/domains/program/lib/template-start-utils'

/**
 * Pure derivations that drive the Programme Overview redesign on the template-start page:
 * phase blocks (Base/Peak), the Base→Peak change line, the intensity ramp, and the overall
 * structure mode — all from the existing `ProgramSetupPreviewWeek[]` payload, no server round-trip.
 */

export type TemplatePhase = {
  phaseKey: string
  phaseLabel: string
  /** e.g. "Weeks 1–9" (or "Week 4" for a single-week phase). Mirrors program-phase-map's convention. */
  weekRange: string
  weekCount: number
  /** previewWeek.index to activate when this phase is selected. */
  firstWeekIndex: number
  /** First week of the phase — its movements/schemes represent the phase. */
  representativeWeek: ProgramSetupPreviewWeek
}

export type ChangeLineEntry = {
  label: string
  from: string
  to: string
  kind: 'scheme' | 'swap'
}

export type PhaseChangeLine = {
  entries: ChangeLineEntry[]
  /** True when the phases have accessories and none of them changed. */
  accessoriesUnchanged: boolean
}

export type IntensityRamp = {
  /** Normalised points, x and y in 0..1 (y: 0 = lowest intensity, 1 = highest). */
  points: { x: number; y: number }[]
  /** SVG paths in a `0 0 1000 120` viewBox (render with preserveAspectRatio="none"). */
  linePath: string
  areaPath: string
  startLabel?: string
  endLabel?: string
  /** False when intensity was approximated from `hardness` (drop the "~NN%" axis labels). */
  hasRealIntensity: boolean
}

export type TemplateStructureMode = 'phased' | 'cycle' | 'weekly'

function flattenMovements(week: ProgramSetupPreviewWeek): ProgramSetupPreviewMovement[] {
  return week.sessions.flatMap((session) => session.movements)
}

/** Phases in first-seen order, with week ranges + the representative (first) week of each. */
export function deriveTemplatePhases(weeks: ProgramSetupPreviewWeek[]): TemplatePhase[] {
  const byKey = new Map<string, ProgramSetupPreviewWeek[]>()
  const order: string[] = []
  for (const week of weeks) {
    if (!byKey.has(week.phaseKey)) {
      byKey.set(week.phaseKey, [])
      order.push(week.phaseKey)
    }
    byKey.get(week.phaseKey)!.push(week)
  }
  return order.map((phaseKey) => {
    const phaseWeeks = byKey.get(phaseKey)!
    const first = phaseWeeks[0]!
    const last = phaseWeeks[phaseWeeks.length - 1]!
    const firstNo = first.index + 1
    const lastNo = last.index + 1
    return {
      phaseKey,
      phaseLabel: first.phaseLabel,
      weekRange: firstNo === lastNo ? `Week ${firstNo}` : `Weeks ${firstNo}–${lastNo}`,
      weekCount: phaseWeeks.length,
      firstWeekIndex: first.index,
      representativeWeek: first,
    }
  })
}

/** What shifts from one phase to the next — slot-matched scheme/movement diffs (mains + variations). */
export function buildPhaseChangeLine(fromPhase: TemplatePhase, toPhase: TemplatePhase): PhaseChangeLine {
  const fromBySlot = new Map(flattenMovements(fromPhase.representativeWeek).map((movement) => [movement.slotId, movement]))
  const entries: ChangeLineEntry[] = []
  const seen = new Set<string>()
  let accessoryCount = 0
  let accessoryChanged = false

  for (const to of flattenMovements(toPhase.representativeWeek)) {
    const from = fromBySlot.get(to.slotId)
    if (!from) continue
    const swapped = from.defaultMovementName !== to.defaultMovementName
    const schemeChanged = from.targetSummary !== to.targetSummary

    if (to.role === 'accessory') {
      accessoryCount += 1
      if (swapped || schemeChanged) accessoryChanged = true
      continue
    }
    if (!swapped && !schemeChanged) continue

    const entry: ChangeLineEntry = swapped
      ? { label: to.roleLabel, from: from.defaultMovementName, to: to.defaultMovementName, kind: 'swap' }
      : { label: to.roleLabel, from: from.targetSummary, to: to.targetSummary, kind: 'scheme' }
    const key = `${entry.label}|${entry.from}|${entry.to}`
    if (seen.has(key)) continue
    seen.add(key)
    entries.push(entry)
  }

  return { entries, accessoriesUnchanged: accessoryCount > 0 && !accessoryChanged }
}

/** Slot ids whose movement or scheme differs from the previous phase (for the "▲ changed" row chips). */
export function changedSlotIds(fromPhase: TemplatePhase, toPhase: TemplatePhase): Set<string> {
  const fromBySlot = new Map(flattenMovements(fromPhase.representativeWeek).map((movement) => [movement.slotId, movement]))
  const changed = new Set<string>()
  for (const to of flattenMovements(toPhase.representativeWeek)) {
    const from = fromBySlot.get(to.slotId)
    if (!from) continue
    if (from.defaultMovementName !== to.defaultMovementName || from.targetSummary !== to.targetSummary) {
      changed.add(to.slotId)
    }
  }
  return changed
}

const HARDNESS_ORDINAL: Record<ProgramSetupPreviewWeek['hardness'], number> = {
  Deload: 0.4,
  Light: 1,
  Medium: 2,
  Hard: 3,
}

const round1 = (value: number) => Math.round(value * 10) / 10

/** SVG ramp of working intensity across the weeks; falls back to a hardness curve when % is absent. */
export function buildIntensityRamp(weeks: ProgramSetupPreviewWeek[]): IntensityRamp {
  const hasRealIntensity = weeks.some((week) => typeof week.intensityPercent === 'number')
  const values = weeks.map((week) => (hasRealIntensity ? (week.intensityPercent ?? 0) : HARDNESS_ORDINAL[week.hardness]))
  const n = values.length

  // viewBox 0 0 1000 120; the line lives between yTop and yBottom, area closes to `floor`.
  const yTop = 16
  const yBottom = 104
  const floor = 120
  const min = n ? Math.min(...values) : 0
  const max = n ? Math.max(...values) : 0
  const span = max - min
  const norm = (value: number) => (span === 0 ? 0.5 : (value - min) / span)
  const svgX = (index: number) => (n <= 1 ? 1000 : (index / (n - 1)) * 1000)
  const svgY = (value: number) => yBottom - norm(value) * (yBottom - yTop)

  let linePath: string
  if (n === 0) {
    linePath = `M 0 ${svgY(0)} L 1000 ${svgY(0)}`
  } else if (n === 1) {
    linePath = `M 0 ${round1(svgY(values[0]!))} L 1000 ${round1(svgY(values[0]!))}`
  } else {
    linePath = values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${round1(svgX(index))} ${round1(svgY(value))}`).join(' ')
  }
  const areaPath = `${linePath} L 1000 ${floor} L 0 ${floor} Z`

  return {
    points: values.map((value, index) => ({ x: n <= 1 ? 0 : index / (n - 1), y: norm(value) })),
    linePath,
    areaPath,
    startLabel: hasRealIntensity ? `~${Math.round((weeks[0]?.intensityPercent ?? 0) * 100)}%` : undefined,
    endLabel: hasRealIntensity ? `~${Math.round((weeks.at(-1)?.intensityPercent ?? 0) * 100)}%` : undefined,
    hasRealIntensity,
  }
}

/**
 * Structure of the programme:
 * - `phased`  — ≥2 distinct phases (Base/Peak) → block timeline + change line + phase tabs.
 * - `cycle`   — one phase but multiple distinct weekly layouts → keep layout tabs.
 * - `weekly`  — one repeating week → the "no phases" strip.
 */
export function templateStructureMode(weeks: ProgramSetupPreviewWeek[]): TemplateStructureMode {
  const phaseKeys = new Set(weeks.map((week) => week.phaseKey))
  if (phaseKeys.size >= 2) return 'phased'
  return compactWeekPreviewOptions(weeks).length >= 2 ? 'cycle' : 'weekly'
}
