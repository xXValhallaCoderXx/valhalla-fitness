import { describe, expect, it } from 'vitest'
import type { WorkoutShareModel } from '@sheetless/domain/history/workout-share'
import { describeWorkoutShare, renderWorkoutShareSvg } from '../src/index'

const model: WorkoutShareModel = {
  title: 'Upper & lower <day>', date: '2026-09-05', dateLabel: 'September 5, 2026',
  filename: 'sheetless-workout-2026-09-05.png', completedSets: 23, durationSeconds: 3723, prCount: 1,
  exercises: [{ movementId: 'a', name: 'Press "best"\u0000\ud800 & <tag>', result: '100 kg × 5', isPr: true }], overflowCount: 2,
}
describe('shared SVG artwork', () => {
  it.each(['light', 'dark'] as const)('renders a complete fixed-size %s card without external resources', (scheme) => {
    const svg = renderWorkoutShareSvg(model, scheme)
    expect(svg).toContain('width="1080" height="1350"')
    expect(svg).toContain('1h 2m')
    expect(svg).toContain('+2 more exercises')
    expect(svg).toContain('100 kg × 5')
    expect(svg).toContain('&amp;')
    expect(svg).toContain('&lt;tag&gt;')
    expect(svg).toContain('&quot;best&quot;')
    expect(svg).not.toMatch(/\u0000|\ud800|<tag>|<image|<foreignObject|href=|url\(/)
    expect(svg).toContain(scheme === 'light' ? '#f2f6f7' : '#081114')
  })
  it('bounds long Unicode names and titles without splitting graphemes', () => {
    const long = '🏋️‍♀️推举'.repeat(100)
    const svg = renderWorkoutShareSvg({ ...model, title: long, exercises: [{ ...model.exercises[0], name: long }] }, 'dark')
    expect(svg).toContain('…')
    expect(svg).not.toContain(long)
    expect(svg).not.toContain('�')
  })
  it('describes exported content accessibly and omits unavailable duration', () => {
    expect(describeWorkoutShare(model)).toContain('100 kg × 5, personal record')
    expect(describeWorkoutShare({ ...model, durationSeconds: null })).not.toContain('elapsed')
    expect(renderWorkoutShareSvg({ ...model, durationSeconds: null }, 'light')).not.toContain('ELAPSED')
  })
})
