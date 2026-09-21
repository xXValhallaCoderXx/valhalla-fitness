import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import type { SessionSummary } from '@sheetless/domain/session/types'
import type { ProgressionDecision } from '@sheetless/domain/program/types'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { themeProviderMock } from './support/theme'
const api = vi.hoisted(() => ({ resolve: vi.fn() }))
vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ user }) }))
vi.mock('@sheetless/data/program/active-program', () => ({ resolveProgressionDecision: api.resolve, resolveProgressionDecisions: vi.fn() }))
vi.mock('@/features/feedback/DecisionFeedback', () => ({ DecisionFeedback: () => null }))
vi.mock('@/components', async () => {
  const { Button } = await import('../src/components/Button')
  const Block = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return { Button, Badge: Block, Caption: Block, Panel: Block, SectionLabel: Block, Text: Block }
})
import { SummaryDecisions } from '../src/features/session/summary/SummaryDecisions'
const user = { id: 'account' } as User
const key = accountQueryKeys.sessionReceipt(user.id, 'saved')
const initial: ProgressionDecision = { id: 'd', movementId: 'bench', movementName: 'Bench', ruleId: 'linear',
  scope: 'session', status: 'pending', inputSummary: '', recommendation: '', previousValue: 80, recommendedValue: 82.5 }
let server: ProgressionDecision
let client: QueryClient
function Receipt() {
  const cache = useQueryClient()
  const read = useQuery({ queryKey: key, queryFn: async () => ({ decisions: [server] }) })
  return read.data ? <SummaryDecisions decisions={read.data.decisions} units="kg" user={user}
    onResolved={(id, status) => cache.setQueryData<SessionSummary>(key, current => current && ({
      ...current, decisions: current.decisions.map(d => d.id === id ? { ...d, status } : d),
    }))} /> : null
}
afterEach(() => { client.clear(); vi.clearAllMocks() })
it.each(['accepted', 'dismissed'] as const)('uses the authoritative %s receipt after a committed choice loses its response', async status => {
  server = { ...initial }
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  api.resolve.mockImplementation(async () => { server = { ...initial, status }; throw new Error('Response lost') })
  render(<QueryClientProvider client={client}><Receipt /></QueryClientProvider>)
  fireEvent.click(await screen.findByRole('button', { name: status === 'accepted' ? 'Apply Bench recommendation' : 'Keep current Bench value' }))
  await screen.findByText(status === 'accepted' ? 'Increase applied' : 'Kept current value')
  expect(screen.queryByRole('button', { name: 'Apply Bench recommendation' })).toBeNull()
  expect(screen.queryByText(/Response lost/)).toBeNull()
  expect(api.resolve).toHaveBeenCalledOnce()
})
it('retries an uncommitted failure with the same request token', async () => {
  server = { ...initial }
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  api.resolve.mockRejectedValueOnce(new Error('Not saved')).mockImplementationOnce(async () => { server = { ...initial, status: 'accepted' }; return [] })
  render(<QueryClientProvider client={client}><Receipt /></QueryClientProvider>)
  fireEvent.click(await screen.findByRole('button', { name: 'Apply Bench recommendation' }))
  await screen.findByText(/Not saved/)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Apply Bench recommendation' }).getAttribute('aria-disabled')).not.toBe('true'))
  fireEvent.click(screen.getByRole('button', { name: 'Apply Bench recommendation' }))
  await screen.findByText('Increase applied')
  expect(api.resolve.mock.calls[0][1].requestId).toBe(api.resolve.mock.calls[1][1].requestId)
})
