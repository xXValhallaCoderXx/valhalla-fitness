import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { HistoryBestSet } from '@sheetless/domain/history/types'
import { formatHistoryVolume } from '@sheetless/domain/history/insight-format'

vi.mock('~/components', () => ({
  Caption: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  SectionLabel: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  StatValue: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))
const { RecordsStatStrip } = await import('../src/domains/history/components/records/RecordsStatStrip')
const record = (id: string, load: number, units: 'kg' | 'lb'): HistoryBestSet => ({ id, movementId: id, movementName: id,
  role: 'main', type: 'top_set', load, e1rm: load * 1.2, reps: 5, units, sessionId: id, sessionTitle: id })

describe('web consumers of corrected history', () => {
  it('chooses kg-normalized heaviest and estimated records and converts aggregate display units', () => {
    const sets = [record('Squat', 150, 'kg'), record('Bench', 200, 'lb')]
    const html = renderToStaticMarkup(<RecordsStatStrip bestSets={sets} units="lb" milestones={{ earned: [], nextUp: null }} />)
    expect(html).toContain('330.7 lb')
    expect(html).toContain('396.8 lb')
    expect(html).toContain('Squat')
    expect(html).not.toContain('Bench')
    expect(sets[0].load).toBe(150)
    expect(sets[0].units).toBe('kg')
  })
  it('formats pound volume without a metric-tonne claim', () => {
    expect(formatHistoryVolume(45000, 'lb')).toBe('45,000 lb')
    expect(formatHistoryVolume(45000, 'kg')).toBe('45.0 t')
  })
})
