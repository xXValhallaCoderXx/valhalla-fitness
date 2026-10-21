import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import { vi, it, expect } from 'vitest'
import { themeProviderMock } from './support/theme'
import { svgMock } from './support/svg'
import { buildHistoryDashboard, type HistorySessionInput } from '@sheetless/domain/history/history'

vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }))
vi.mock('expo-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('react-native-svg', () => svgMock())
vi.mock('lucide-react-native', () => ({ ChevronLeft: () => null, ChevronRight: () => null }))
vi.mock('@/components/SettingsHeaderAction', () => ({ SettingsHeaderAction: () => null }))
vi.mock('@/components/SheetModal', () => ({ SheetModal: () => null }))
vi.mock('@/features/history/movements/MovementHistorySheet', () => ({ MovementHistorySheet: ({ movementName }: { movementName: string }) => <div>{movementName} source logs</div> }))
const { InsightsStateProvider, useInsightsState } = await import('../src/features/history/navigation/InsightsState')
const { InsightsSessions } = await import('../src/features/history/sessions/InsightsSessions')
const { InsightsMovements } = await import('../src/features/history/movements/InsightsMovements')
const { InsightsRecords } = await import('../src/features/history/records/InsightsRecords')

const sessions: HistorySessionInput[] = Array.from({ length: 240 }, (_, index) => ({
  id: `s${index}`, title: `Workout ${index}`, scheduledDate: '2026-09-28', completedAt: new Date(Date.parse('2026-09-28') - index * 1000).toISOString(),
  plannedSessionId: null, units: 'kg', movementCount: 1, plannedSetCount: 3, hardness: index === 239 ? 'Hard' : 'Medium',
  exercises: [{ id: `e${index}`, plannedMovementId: `movement${index}`, performedMovementId: `movement${index}`, performedMovementName: `Movement ${index}`,
    role: 'accessory', sets: [{ id: `set${index}`, setIndex: 1, actualLoad: 50, actualReps: 5, completed: true },
      { id: `empty${index}`, setIndex: 2, completed: index !== 239 }] }],
}))
const data = buildHistoryDashboard({ sessions, substitutions: [], recentSessionLimit: null, bestSetLimit: null })
const wrapper = ({ children }: { children: React.ReactNode }) => <InsightsStateProvider accountId="one">{children}</InsightsStateProvider>

it('keeps filters, search, sort and scroll across destination remounts and resets them on account change', () => {
  let account = 'one'
  const { result, rerender } = renderHook(() => useInsightsState(), { wrapper: ({ children }) => <InsightsStateProvider accountId={account}>{children}</InsightsStateProvider> })
  act(() => { result.current.update({ range: 'all', movements: { query: 'squat', category: 'legs', sort: 'e1rm', direction: 'asc' },
    sessions: { query: 'older', intensity: 'Hard', completion: 'cut_short', date: '2026-09-28', page: 4 } }); result.current.setScroll('workouts', 723) })
  rerender()
  expect(result.current.state.scroll.workouts).toBe(723)
  expect(result.current.state.sessions.page).toBe(4)
  expect(result.current.state.movements.query).toBe('squat')
  account = 'two'; rerender()
  expect(result.current.state.range).toBe('8w')
  expect(result.current.state.movements.query).toBe('')
  expect(result.current.state.sessions.page).toBe(0)
  expect(result.current.state.scroll).toEqual({})
})

it('reaches beyond row 60 and filters/searches row 239 before pagination, then opens its recap', () => {
  const open = vi.fn()
  render(<InsightsSessions sessions={data.recentSessions} today="2026-09-28" units="kg" onOpen={open} />, { wrapper })
  for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Older' }))
  expect(screen.getByText('Workout 60')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Search workouts'), { target: { value: 'Workout 239' } })
  fireEvent.click(screen.getByRole('tab', { name: 'Cut short' }))
  fireEvent.click(screen.getByRole('tab', { name: 'Hard' }))
  expect(screen.getByText('Page 1 of 1')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Open Workout 239, 2026-09-28' }))
  expect(open).toHaveBeenCalledWith('s239')
  fireEvent.click(screen.getByRole('button', { name: '2026-09-28, 240 workouts' }))
  expect(screen.getByRole('button', { name: 'Clear date · 2026-09-28' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '2026-09-28, 240 workouts' }))
  expect(screen.queryByRole('button', { name: 'Clear date · 2026-09-28' })).toBeNull()
})

it('searches every movement and retains its source units', () => {
  const movements = data.movementSummaries.map(row => ({ ...row, bestSet: row.bestSet ? { ...row.bestSet, load: 150, units: 'kg' as const } : null }))
  render(<InsightsMovements movements={movements} units="lb" user={{ id: 'one' } as User} />, { wrapper })
  fireEvent.change(screen.getByPlaceholderText('Search movements'), { target: { value: 'Movement 239' } })
  expect(screen.getByText(/Best 150 kg/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Open Movement 239' }))
  expect(screen.getByText('Movement 239 source logs')).toBeTruthy()
})

it('shows baseline best sets with source actions and complete searchable coverage', () => {
  const open = vi.fn()
  render(<InsightsRecords records={data.bestSets} user={{ id: 'one' } as User} onOpenSession={open} />, { wrapper })
  fireEvent.change(screen.getByLabelText('Search best sets'), { target: { value: 'Movement 239' } })
  expect(screen.getByText('2026-09-28 · Baseline')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Open workout · Workout 239' }))
  expect(open).toHaveBeenCalledWith('s239')
})
