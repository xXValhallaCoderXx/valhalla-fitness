import { describe, expect, it } from 'vitest'
import { buildLiftStats } from '@sheetless/domain/history/lift-stats'
import type { E1rmPoint } from '@sheetless/domain/history/types'

function point(date: string, e1rm: number, over: Partial<E1rmPoint> = {}): E1rmPoint {
  return {
    date,
    sessionId: `s-${date}`,
    e1rm,
    load: over.load ?? e1rm,
    reps: over.reps ?? 1,
    rir: over.rir ?? null,
    outlier: over.outlier ?? false,
  }
}

const series = [
  point('2026-06-15', 200, { load: 160, reps: 5, rir: 2 }),
  point('2026-07-12', 203.5, { load: 185, reps: 1, rir: 2 }),
  point('2026-07-22', 206.6, { load: 167.5, reps: 5, rir: 2 }),
]

const build = (over: Partial<Parameters<typeof buildLiftStats>[0]> = {}) =>
  buildLiftStats({ points: series, trainingMax: null, units: 'kg', mode: 'full', ...over })

describe('buildLiftStats', () => {
  it('leads with the latest estimate and the set it came off', () => {
    const [current] = build()
    expect(current).toMatchObject({
      key: 'current',
      label: 'Current e1RM',
      value: '206.6 kg',
      detail: '22 Jul · 167.5 kg × 5 @ RIR 2',
    })
  })

  // After a long gap the latest reading is history, not current form.
  it('leads with the best when the account is coming back', () => {
    expect(build({ staleWelcomeBack: true })[0]).toMatchObject({ label: 'Best e1RM', value: '206.6 kg' })
  })

  it('names the heaviest set and what it estimated to', () => {
    const heaviest = build().find((stat) => stat.key === 'heaviest')
    expect(heaviest).toMatchObject({ value: '185 kg × 1', detail: '12 Jul · RIR 2 · e1RM 203.5' })
  })

  it('reports the training max against the best estimate, and what moved it', () => {
    const stat = build({ trainingMax: { value: 192.5, updatedAt: '2026-07-12', changedBy: 5 } })
      .find((entry) => entry.key === 'training_max')
    expect(stat).toMatchObject({ label: 'Training max', value: '192.5 kg', detail: '93 % of e1RM · +5 on 12 Jul' })
  })

  // A cell with nothing behind it is dropped, not em-dashed.
  it('omits the training max entirely when the programme has none', () => {
    expect(build().map((stat) => stat.key)).toEqual(['current', 'heaviest', 'change'])
  })

  it('measures the change across the window', () => {
    const change = build().find((stat) => stat.key === 'change')
    expect(change).toMatchObject({ value: '+6.6 kg e1RM', detail: '200 → 206.6 · 15 Jun – 22 Jul' })
  })

  it('calls a single session a reading, not a change', () => {
    const one = build({ points: series.slice(0, 1) })
    expect(one.some((stat) => stat.key === 'change')).toBe(false)
  })

  it('ignores outliers and survives an empty range', () => {
    const withTypo = [...series, point('2026-07-30', 900, { load: 400, outlier: true })]
    expect(build({ points: withTypo })[0].value).toBe('206.6 kg')
    expect(build({ points: [] })).toEqual([{ key: 'current', label: 'Current e1RM', value: '—', detail: null }])
  })

  it('uses plain words in Guided', () => {
    const guided = build({ mode: 'guided', trainingMax: { value: 192.5 } })
    expect(guided.map((stat) => stat.label)).toContain('Heaviest lift')
    expect(guided.map((stat) => stat.label)).toContain('Training weight')
  })
})
