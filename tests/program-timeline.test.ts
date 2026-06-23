import { describe, expect, it } from 'vitest'
import { buildBullmastiffTimeline, buildHealthy531Timeline, buildProgramTimeline } from '../src/lib/program-timeline'

describe('program timeline model', () => {
  it('normalizes 5/3/1 into week/session timeline rows', () => {
    const timeline = buildHealthy531Timeline(4)

    expect(timeline.totalWeeks).toBe(4)
    expect(timeline.currentWeekIndex).toBe(1)
    expect(timeline.currentSessionInWeek).toBe(0)
    expect(timeline.weeks[1]?.sessions).toHaveLength(4)
    expect(timeline.weeks[1]?.sessions[0]).toMatchObject({
      title: 'Squat + Lower Accessories',
      movementSummary: 'Squat, Leg Press, Hamstring Curl, Cable Crunch',
      keyPrescription: '70%x3 · 80%x3 · 90%x3+ · FSL 5x5',
    })
    expect(timeline.weeks[1]?.sessions[0]?.movements.map((movement) => movement.roleLabel)).toEqual([
      'Main',
      'Accessory 1',
      'Accessory 2',
      'Accessory 3',
    ])
  })

  it('normalizes Bullmastiff into an 18-week base-to-peak timeline', () => {
    const timeline = buildBullmastiffTimeline(36)

    expect(timeline.totalWeeks).toBe(18)
    expect(timeline.currentWeekIndex).toBe(9)
    expect(timeline.currentSessionInWeek).toBe(0)
    expect(timeline.weeks[8]?.summary).toContain('4x4+ main work around 80%')
    expect(timeline.weeks[9]?.subtitle).toBe('Peak phase · Wave 1, week 1')
    expect(timeline.weeks[9]?.sessions[0]).toMatchObject({
      title: 'Bullmastiff Squat',
      movementSummary: 'Squat, Pause Squat, Leg Press, Hamstring Curl',
      keyPrescription: '5 sets x 3+ @ 85%',
    })
    expect(timeline.weeks[9]?.sessions[0]?.movements[1]).toMatchObject({
      roleLabel: 'Variation',
      movementName: 'Pause Squat',
      targetSummary: '4 sets x 6 @ 75%',
    })
  })

  it('shows every Alternating 5x5 LP lift instead of collapsing to the first main slot', () => {
    const timeline = buildProgramTimeline({ templateId: 'generic_alternating_5x5_lp', currentWeekIndex: 0 })

    expect(timeline.weeks[0]?.sessions.map((session) => session.movementSummary)).toEqual([
      'Squat, Bench Press, Barbell Row',
      'Squat, Overhead Press, Deadlift',
      'Squat, Bench Press, Barbell Row',
    ])
    expect(timeline.weeks[1]?.sessions.map((session) => session.movementSummary)).toEqual([
      'Squat, Overhead Press, Deadlift',
      'Squat, Bench Press, Barbell Row',
      'Squat, Overhead Press, Deadlift',
    ])
    expect(timeline.weeks[0]?.sessions[1]?.movements.map((movement) => movement.roleLabel)).toEqual([
      'Main 1',
      'Main 2',
      'Main 3',
    ])
    expect(timeline.weeks[0]?.sessions[1]?.movements.map((movement) => movement.targetSummary)).toEqual([
      '5x5 @ current working load',
      '5x5 @ current working load',
      '1x5 @ current working load',
    ])
  })

  it('selects the correct timeline builder from the active template id', () => {
    expect(buildProgramTimeline({ templateId: 'bromley-bullmastiff', currentWeekIndex: 0 }).totalWeeks).toBe(18)
    expect(buildProgramTimeline({ templateId: 'healthy-531-fsl', currentWeekIndex: 0 }).totalWeeks).toBe(4)
    expect(buildProgramTimeline({ templateId: 'bromley-70s-powerlifter', currentWeekIndex: 0 }).totalWeeks).toBe(18)
    expect(buildProgramTimeline({ templateId: 'bromley-volume-intensity', currentWeekIndex: 0 }).totalWeeks).toBe(6)
  })
})
