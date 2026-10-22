import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { HistoryBestSet } from '@sheetless/domain/history/types'
import { formatHistoryVolume } from '@sheetless/domain/history/insight-format'
import { buildSessionLedgerRows } from '@sheetless/domain/history/session-ledger'
import type { LiftE1rmSeries, RecentHistoryEntry } from '@sheetless/domain/history/types'

vi.mock('~/components', () => ({
  Caption: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  SectionLabel: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  StatValue: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  EquipmentModeBadge: () => null,
}))
vi.mock('@mantine/core', () => ({ Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }))
vi.mock('~/domains/account/components', () => ({ useExperienceMode: () => ({ isFull: true }) }))
vi.mock('~/domains/account/components/AccountIdentityProvider', () => ({
  useAccountClock: () => ({ today: '2026-09-28', timeZone: 'UTC' }),
}))
const { RecordsStatStrip } = await import('../src/domains/history/components/records/RecordsStatStrip')
const { SessionLedgerTable } = await import('../src/domains/history/components/sessions/SessionLedgerTable')
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

  it('renders an earned session PR when a stronger non-PR lift is the headline, in either lift order', () => {
    const sessions: RecentHistoryEntry[] = ['before', 'after'].map((id, i) => ({
      id, title: id, scheduledDate: i ? '2026-09-28' : '2026-09-01',
      completedAt: null, movementCount: 2, completedSetCount: 2, plannedSetCount: 2,
      tonnage: 1500, durationMinutes: null,
    }))
    const liftSeries: LiftE1rmSeries[] = ['Squat', 'Deadlift'].map((movementName, lift) => ({
      movementId: lift ? 'deadlift' : 'squat', movementName,
      repMaxBests: { oneRm: null, threeRm: null, fiveRm: null },
      points: sessions.map((session, i) => ({
        date: session.scheduledDate, sessionId: session.id, load: lift ? 200 : 100 + i * 10,
        reps: 5, rir: 0, e1rm: lift ? 233.5 : 116.5 + i * 12, outlier: false,
      })),
    }))
    for (const series of [liftSeries, [...liftSeries].reverse()]) {
      const rows = buildSessionLedgerRows({ sessions, liftSeries: series })
      const after = rows.filter(row => row.id === 'after')
      const html = renderToStaticMarkup(<SessionLedgerTable rows={after} units="kg" onOpen={() => {}} />)
      expect(html).toContain('aria-label="Personal best"')
      expect(html).toContain('Deadlift')
      const before = renderToStaticMarkup(<SessionLedgerTable rows={rows.filter(row => row.id === 'before')} units="kg" onOpen={() => {}} />)
      expect(before).not.toContain('aria-label="Personal best"')
    }
  })
})
