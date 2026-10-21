import { createContext, useContext, useState, type ReactNode } from 'react'
import type { InsightRange } from '@sheetless/domain/history/insight-ranges'
import type { MovementSortKey, SortDir } from '@sheetless/domain/history/insights'
import type { SessionBrowserState } from '@sheetless/domain/history/session-browser'

export type InsightsDestination = 'index' | 'strength' | 'lifts' | 'best-sets' | 'muscles' | 'workouts'
export type MovementBrowserState = { query: string; category: string | null; sort: MovementSortKey; direction: SortDir }
export type RecordBrowserState = { query: string; sort: 'recent' | 'strength' }
export type MuscleView = 'balance' | 'this-week' | 'by-week' | 'fatigue'

function initialState() {
  return {
    range: '8w' as InsightRange,
    movements: { query: '', category: null, sort: 'last', direction: 'desc' } as MovementBrowserState,
    records: { query: '', sort: 'recent' } as RecordBrowserState,
    sessions: { query: '', intensity: 'all', completion: 'all', date: null, page: 0 } as SessionBrowserState,
    muscleView: 'balance' as MuscleView,
    muscleWeek: null as string | null,
    scroll: {} as Partial<Record<InsightsDestination, number>>,
  }
}

type State = ReturnType<typeof initialState>
const Context = createContext<{ state: State; update: (patch: Partial<State>) => void; setScroll: (page: InsightsDestination, y: number) => void } | null>(null)

/** Keyed at the account boundary; state survives popped detail routes, never another account. */
export function InsightsStateProvider({ accountId, children }: { accountId: string; children: ReactNode }) {
  return <AccountState key={accountId}>{children}</AccountState>
}

function AccountState({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState)
  const update = (patch: Partial<State>) => setState(current => ({ ...current, ...patch }))
  const setScroll = (page: InsightsDestination, y: number) => setState(current =>
    current.scroll[page] === y ? current : { ...current, scroll: { ...current.scroll, [page]: y } })
  return <Context.Provider value={{ state, update, setScroll }}>{children}</Context.Provider>
}

export function useInsightsState() {
  const value = useContext(Context)
  if (!value) throw new Error('Insights pages require the account state provider.')
  return value
}
