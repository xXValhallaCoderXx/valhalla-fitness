import { describe, expect, it } from 'vitest'
import { buildOldSchoolWaveTimeline } from '../src/domains/program/lib/program-timeline'
import { buildProgramPhaseMap } from '../src/domains/program/lib/program-phase-map'
import type { ProgramTimelineModel, TimelineWeek } from '../src/domains/program/lib/template-engine'

function makeWeek(
  partial: Partial<TimelineWeek> & { index: number; phaseKey: string; phaseLabel: string },
): TimelineWeek {
  return {
    subtitle: '',
    summary: '',
    waveLabel: undefined,
    hardness: 'Medium',
    sessions: [],
    ...partial,
  }
}

function makeTimeline(weeks: TimelineWeek[], currentWeekIndex: number): ProgramTimelineModel {
  return {
    totalWeeks: weeks.length,
    daysPerWeek: 4,
    currentWeekIndex,
    currentSessionInWeek: 0,
    description: 'test',
    weeks,
  }
}

describe('buildProgramPhaseMap', () => {
  it('groups an 18-week base→peak program into two phases of three waves × three weeks', () => {
    const timeline = buildOldSchoolWaveTimeline(36) // currentWeekIndex 9 (week 10)
    const map = buildProgramPhaseMap(timeline)

    expect(map.totalWeeks).toBe(18)
    expect(map.currentWeekNumber).toBe(10)
    expect(map.currentPhaseLabel).toBe('Peak phase')
    expect(map.currentWaveLabel).toBe('Wave 1')

    expect(map.phases.map((phase) => phase.label)).toEqual(['Base phase', 'Peak phase'])
    expect(map.phases[0]).toMatchObject({ range: 'Weeks 1–9' })
    expect(map.phases[1]).toMatchObject({ range: 'Weeks 10–18' })

    for (const phase of map.phases) {
      expect(phase.weeks).toHaveLength(9)
      expect(phase.waves).toHaveLength(3)
      expect(phase.waves.map((wave) => wave.label)).toEqual(['Wave 1', 'Wave 2', 'Wave 3'])
      for (const wave of phase.waves) expect(wave.weeks).toHaveLength(3)
    }
  })

  it('marks weeks done / current / upcoming relative to the current week', () => {
    const map = buildProgramPhaseMap(buildOldSchoolWaveTimeline(36)) // current index 9

    expect(map.phases[0].weeks.every((week) => week.status === 'done')).toBe(true)
    const peak = map.phases[1].weeks
    expect(peak[0]).toMatchObject({ number: 10, status: 'current', isCurrent: true })
    expect(peak.slice(1).every((week) => week.status === 'upcoming')).toBe(true)
  })

  it('handles a single-phase program (one phase spanning all weeks)', () => {
    const weeks = [0, 1, 2, 3].map((index) =>
      makeWeek({ index, phaseKey: 'main', phaseLabel: 'Main block', waveLabel: `Wave ${Math.floor(index / 2) + 1}` }),
    )
    const map = buildProgramPhaseMap(makeTimeline(weeks, 1))

    expect(map.phases).toHaveLength(1)
    expect(map.phases[0]).toMatchObject({ key: 'main', label: 'Main block', range: 'Weeks 1–4' })
    expect(map.phases[0].waves).toHaveLength(2)
    expect(map.currentPhaseLabel).toBe('Main block')
  })

  it('collapses weeks without a waveLabel into a single unnamed wave per phase', () => {
    const weeks = [0, 1, 2].map((index) => makeWeek({ index, phaseKey: 'base', phaseLabel: 'Base phase' }))
    const map = buildProgramPhaseMap(makeTimeline(weeks, 0))

    expect(map.phases).toHaveLength(1)
    expect(map.phases[0].waves).toHaveLength(1)
    expect(map.phases[0].waves[0].label).toBeUndefined()
    expect(map.phases[0].waves[0].weeks).toHaveLength(3)
    expect(map.currentWaveLabel).toBeNull()
  })
})
