import { describe, expect, it } from 'vitest'
import type { WorkoutShareModel } from '@sheetless/domain/history/workout-share'
import { describeWorkoutShare, renderWorkoutShareSvg } from '../src/index'

const model: WorkoutShareModel = {
  title: 'Upper & lower <day>', date: '2026-09-05', dateLabel: 'September 5, 2026',
  filename: 'sheetless-workout-2026-09-05.png', completedSets: 23, durationSeconds: 3723, prCount: 1,
  exercises: [{ movementId: 'a', name: 'Press "best"\u0000\ud800 & <tag>', result: '100 kg × 5', isPr: true }], overflowCount: 2,
}
const textAtSize = (svg: string, size: number) => [...svg.matchAll(
  new RegExp(`<text[^>]*font-size="${size}"[^>]*>(.*?)</text>`, 'g'),
)].map((match) => match[1])

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
  it.each([
    { glyph: 'W', titleAdvance: 62, nameAdvance: 34 },
    { glyph: 'm', titleAdvance: 59, nameAdvance: 32 },
    { glyph: '1', titleAdvance: 40, nameAdvance: 22 },
  ])('keeps repeated $glyph glyphs inside their text area', ({ glyph, titleAdvance, nameAdvance }) => {
    const svg = renderWorkoutShareSvg({
      ...model, title: glyph.repeat(100),
      exercises: [{ ...model.exercises[0], name: glyph.repeat(100) }],
    }, 'dark')
    const titleLines = textAtSize(svg, 56)
    expect(titleLines).toHaveLength(2)
    // Bold system-font W can exceed 1.1em. At 56px, the old 22-character
    // line painted more than 1300px into the 952px content area.
    // Chromium's system sans measured 61.77px per bold W at 56px.
    for (const line of titleLines) expect(line.length * titleAdvance).toBeLessThanOrEqual(952)
    const [name] = textAtSize(svg, 30).filter((value) => value !== 'SHEETLESS')
    expect(name).toMatch(new RegExp(`^${glyph}+…$`))
    expect(name.length * nameAdvance).toBeLessThan(890)
  })
  it.each(['🏋️‍♀️', '👨‍👩‍👧‍👦', '🇸🇬', 'e\u0301'])('truncates %s at a complete cluster', (cluster) => {
    const svg = renderWorkoutShareSvg({ ...model, title: cluster.repeat(100) }, 'light')
    const [first, second] = textAtSize(svg, 56)
    expect(first.length).toBeGreaterThan(0)
    expect(first).toBe(cluster.repeat(first.length / cluster.length))
    expect(second.endsWith('…')).toBe(true)
    const visible = second.slice(0, -1)
    expect(visible).toBe(cluster.repeat(visible.length / cluster.length))
  })
  it('does not truncate a name just to reserve an unused ellipsis', () => {
    const svg = renderWorkoutShareSvg({
      ...model, exercises: [{ ...model.exercises[0], name: 'A'.repeat(23) }],
    }, 'light')
    expect(textAtSize(svg, 30)).toContain('A'.repeat(23))
  })
  it('describes exported content accessibly and omits unavailable duration', () => {
    expect(describeWorkoutShare(model)).toContain('100 kg × 5, personal record')
    expect(describeWorkoutShare({ ...model, durationSeconds: null })).not.toContain('elapsed')
    expect(renderWorkoutShareSvg({ ...model, durationSeconds: null }, 'light')).not.toContain('ELAPSED')
  })
})
