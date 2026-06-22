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
      title: 'Squat',
      mainPrescription: '70%x3 · 80%x3 · 90%x3+',
      variationMovement: 'FSL supplemental work',
    })
  })

  it('normalizes Bullmastiff into an 18-week base-to-peak timeline', () => {
    const timeline = buildBullmastiffTimeline(36)

    expect(timeline.totalWeeks).toBe(18)
    expect(timeline.currentWeekIndex).toBe(9)
    expect(timeline.currentSessionInWeek).toBe(0)
    expect(timeline.weeks[8]?.summary).toContain('Next week starts a new wave: 5x3+ around 85%.')
    expect(timeline.weeks[9]?.subtitle).toBe('Peak phase · Wave 1, week 1')
    expect(timeline.weeks[9]?.sessions[0]).toMatchObject({
      title: 'Squat',
      mainPrescription: '5x3+ @ 85%',
      variationMovement: 'Pause Squat',
    })
  })

  it('selects the correct timeline builder from the active template id', () => {
    expect(buildProgramTimeline({ templateId: 'bromley-bullmastiff', currentWeekIndex: 0 }).totalWeeks).toBe(18)
    expect(buildProgramTimeline({ templateId: 'healthy-531-fsl', currentWeekIndex: 0 }).totalWeeks).toBe(4)
  })
})
