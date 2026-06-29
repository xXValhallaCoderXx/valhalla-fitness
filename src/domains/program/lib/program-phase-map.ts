import type { ProgramTimelineModel, TimelineWeek } from '~/domains/program/lib/template-engine'

/**
 * Phase map — a glanceable model of the whole program grouped into phases and
 * waves, so the command bar can answer "what stage am I at?" in one look.
 *
 * Pure derivation from the timeline model (which already carries each week's
 * phaseKey / phaseLabel / waveLabel). Adaptive: programs with a single phase or
 * no named waves still produce a sensible map (one phase / one unnamed wave).
 */

export type PhaseMapWeekStatus = 'done' | 'current' | 'upcoming'

export type PhaseMapWeek = {
  /** 0-based timeline index. */
  index: number
  /** 1-based week number (index + 1). */
  number: number
  status: PhaseMapWeekStatus
  isCurrent: boolean
}

export type PhaseMapWave = {
  label?: string
  weeks: PhaseMapWeek[]
}

export type PhaseMapPhase = {
  key: string
  label: string
  /** e.g. "Weeks 1–9" (or "Week 4" when the phase is a single week). */
  range: string
  weeks: PhaseMapWeek[]
  waves: PhaseMapWave[]
}

export type ProgramPhaseMap = {
  phases: PhaseMapPhase[]
  totalWeeks: number
  currentWeekNumber: number
  currentPhaseLabel: string | null
  currentWaveLabel: string | null
}

function weekStatus(week: TimelineWeek, currentWeekIndex: number): PhaseMapWeekStatus {
  if (week.index < currentWeekIndex) return 'done'
  if (week.index === currentWeekIndex) return 'current'
  return 'upcoming'
}

export function buildProgramPhaseMap(timeline: ProgramTimelineModel): ProgramPhaseMap {
  const currentWeekIndex = timeline.currentWeekIndex
  const phases: PhaseMapPhase[] = []
  const phaseByKey = new Map<string, PhaseMapPhase>()

  for (const week of timeline.weeks) {
    const mappedWeek: PhaseMapWeek = {
      index: week.index,
      number: week.index + 1,
      status: weekStatus(week, currentWeekIndex),
      isCurrent: week.index === currentWeekIndex,
    }

    let phase = phaseByKey.get(week.phaseKey)
    if (!phase) {
      phase = { key: week.phaseKey, label: week.phaseLabel, range: '', weeks: [], waves: [] }
      phaseByKey.set(week.phaseKey, phase)
      phases.push(phase)
    }
    phase.weeks.push(mappedWeek)

    // Group into contiguous runs of the same waveLabel; weeks with no waveLabel
    // collapse into a single unnamed wave per phase.
    const lastWave = phase.waves[phase.waves.length - 1]
    if (lastWave && lastWave.label === week.waveLabel) {
      lastWave.weeks.push(mappedWeek)
    } else {
      phase.waves.push({ label: week.waveLabel, weeks: [mappedWeek] })
    }
  }

  for (const phase of phases) {
    const first = phase.weeks[0]?.number
    const last = phase.weeks[phase.weeks.length - 1]?.number
    phase.range = first === last ? `Week ${first}` : `Weeks ${first}–${last}`
  }

  const currentWeek = timeline.weeks.find((week) => week.index === currentWeekIndex)
  return {
    phases,
    totalWeeks: timeline.totalWeeks,
    currentWeekNumber: currentWeekIndex + 1,
    currentPhaseLabel: currentWeek?.phaseLabel ?? null,
    currentWaveLabel: currentWeek?.waveLabel ?? null,
  }
}
