import { describe, expect, it } from 'vitest'
import { buildOldSchoolWaveTimeline, buildProgramTimeline, buildTrainingMaxWaveTimeline } from '../src/lib/program-timeline'

describe('program timeline model', () => {
  it('normalizes training-max waves into week/session timeline rows', () => {
    const timeline = buildTrainingMaxWaveTimeline(4)

    expect(timeline.totalWeeks).toBe(4)
    expect(timeline.currentWeekIndex).toBe(1)
    expect(timeline.currentSessionInWeek).toBe(0)
    expect(timeline.weeks[1]?.sessions).toHaveLength(4)
    expect(timeline.weeks[1]?.sessions[0]).toMatchObject({
      title: 'Squat + Lower Accessories',
      movementSummary: 'Squat, Leg Press, Hamstring Curl, Cable Crunch',
      keyPrescription: '70%x3 · 80%x3 · 90%x3+ · back-off 5x5',
    })
    expect(timeline.weeks[1]?.sessions[0]?.movements.map((movement) => movement.roleLabel)).toEqual([
      'Main',
      'Accessory 1',
      'Accessory 2',
      'Accessory 3',
    ])
  })

  it('normalizes old-school wave powerbuilding into an 18-week base-to-peak timeline', () => {
    const timeline = buildOldSchoolWaveTimeline(36)

    expect(timeline.totalWeeks).toBe(18)
    expect(timeline.currentWeekIndex).toBe(9)
    expect(timeline.currentSessionInWeek).toBe(0)
    expect(timeline.weeks[8]?.summary).toContain('4x4+ main work around 80%')
    expect(timeline.weeks[9]?.subtitle).toBe('Peak phase · Wave 1, week 1')
    expect(timeline.weeks[9]?.sessions[0]).toMatchObject({
      title: 'Squat Wave',
      movementSummary: 'Squat, Pause Squat, Leg Press, Hamstring Curl',
      keyPrescription: '5 sets x 3+ @ 85%',
    })
    expect(timeline.weeks[9]?.sessions[0]?.movements[1]).toMatchObject({
      roleLabel: 'Variation',
      movementName: 'Pause Squat',
      targetSummary: '4 sets x 6 @ 75%',
    })
  })

  it('shows every beginner 5x5 lift instead of collapsing to the first main slot', () => {
    const timeline = buildProgramTimeline({ templateId: 'generic_alternating_5x5_lp', currentWeekIndex: 0 })

    expect(timeline.weeks[0]?.sessions.map((session) => session.movementSummary)).toEqual([
      'Squat, Bench Press, Barbell Row, Chin-Up, Back Extension',
      'Squat, Overhead Press, Deadlift, Lat Pulldown, Sit-Up',
      'Squat, Bench Press, Barbell Row, Pull-Up, Cable Crunch',
    ])
    expect(timeline.weeks[1]?.sessions.map((session) => session.movementSummary)).toEqual([
      'Squat, Overhead Press, Deadlift, Chin-Up, Back Extension',
      'Squat, Bench Press, Barbell Row, Lat Pulldown, Sit-Up',
      'Squat, Overhead Press, Deadlift, Pull-Up, Cable Crunch',
    ])
    expect(timeline.weeks[0]?.sessions[1]?.movements.map((movement) => movement.roleLabel)).toEqual([
      'Main 1',
      'Main 2',
      'Main 3',
      'Accessory 1',
      'Accessory 2',
    ])
    expect(timeline.weeks[0]?.sessions[1]?.movements.map((movement) => movement.targetSummary)).toEqual([
      '5x5 @ current working load',
      '5x5 @ current working load',
      '1x5 @ current working load',
      '3 sets x 6-10 reps @ RIR 2',
      '3 sets x 10-15 reps @ RIR 2',
    ])
  })

  it('selects the correct timeline builder from the active template id', () => {
    expect(buildProgramTimeline({ templateId: 'bromley-bullmastiff', currentWeekIndex: 0 }).totalWeeks).toBe(18)
    expect(buildProgramTimeline({ templateId: 'healthy-531-fsl', currentWeekIndex: 0 }).totalWeeks).toBe(4)
    expect(buildProgramTimeline({ templateId: 'bromley-70s-powerlifter', currentWeekIndex: 0 }).totalWeeks).toBe(18)
    expect(buildProgramTimeline({ templateId: 'bromley-volume-intensity', currentWeekIndex: 0 }).totalWeeks).toBe(6)
  })
})
