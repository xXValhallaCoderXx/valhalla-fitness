import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProgressionDecision } from '@sheetless/domain/program/types'
import type { SessionSummary } from '@sheetless/domain/session/types'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { themeProviderMock } from './support/theme'

const api = vi.hoisted(() => ({ read: vi.fn(), navigate: vi.fn(), focused: true }))
vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('@/lib/session-provider', () => ({ useSession: () => ({ user: { id: 'account-a' } }) }))
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ user }), useMe: () => ({ data: { experienceMode: 'guided' } }) }))
vi.mock('expo-router', () => ({
  router: { replace: api.navigate, push: api.navigate, dismissTo: api.navigate },
  useIsFocused: () => api.focused,
}))
vi.mock('@sheetless/data/session/summary', () => ({ getSessionSummary: api.read }))
vi.mock('@/components', async () => {
  const { Button } = await import('../src/components/Button')
  const Block = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return {
    Button, Screen: Block, Panel: Block, Text: Block, Caption: Block, Heading: Block, SectionLabel: Block,
    SheetModal: ({ title, children, footer, onClose }: { title: string; children: ReactNode; footer: ReactNode; onClose: () => void }) =>
      <div role="dialog" aria-label={title}><button onClick={onClose}>Close sheet</button>{children}{footer}</div>,
    PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
    EmptyState: ({ title, children }: { title: string; children: ReactNode }) => <div><h2>{title}</h2>{children}</div>,
  }
})
vi.mock('@sheetless/domain/feedback/post-workout', () => ({ postWorkoutFeedbackEligible: () => true }))
vi.mock('@/features/feedback/PostWorkoutFeedback', () => ({ PostWorkoutFeedback: () => <div>Fresh finish feedback</div> }))
vi.mock('@/features/session/live/ReturnSessionNotice', () => ({ ReturnSessionNotice: () => null }))
vi.mock('@/features/session/summary/WorkoutSummaryRecap', () => ({ WorkoutSummaryRecap: () => <div>Saved workout recap</div> }))
vi.mock('@/features/session/summary/AdHocSessionActions', () => ({ AdHocSessionActions: () => null }))
vi.mock('@/features/history/sharing/WorkoutSharePreview', () => ({ WorkoutSharePreview: ({ onBack }: { onBack: () => void }) => <button onClick={onBack}>Back to summary</button> }))
vi.mock('@/features/session/summary/RecapLayout', () => ({
  RecapLayout: ({ children, footer }: { children: ReactNode; footer: ReactNode }) => <div>{children}{footer}</div>,
  RecapActions: ({ onShare, onDone }: { onShare?: () => void; onDone: () => void }) => <>
    {onShare ? <button onClick={onShare}>Share workout</button> : null}<button onClick={onDone}>Done</button>
  </>,
}))
vi.mock('@/features/session/summary/SummaryDecisions', () => ({
  SummaryDecisions: ({ decisions, onResolved }: {
    decisions: ProgressionDecision[]
    onResolved: (id: string, action: 'accepted' | 'dismissed') => void
  }) => <div>{decisions.map((decision) => <div key={decision.id}>
    <p>Decision {decision.status}</p>
    <p>{recapDecisionView(decision, 'kg').change}</p>
    {decision.status === 'pending' ? <>
      <button onClick={() => onResolved(decision.id, 'accepted')}>Apply recommendation</button>
      <button onClick={() => onResolved(decision.id, 'dismissed')}>Keep current value</button>
    </> : null}
  </div>)}</div>,
}))

import { SessionSummaryScreen } from '../src/features/session/SessionSummaryScreen'
import { SessionSummarySheet } from '../src/features/history/sessions/SessionSummarySheet'
import { recapDecisionView } from '../src/features/session/summary/recap-progression'

function summary(status: ProgressionDecision['status'] = 'pending'): SessionSummary {
  return {
    session: {
      id: 'planned-a', sessionId: 'session-a', stateVersion: 5, status: 'completed',
      title: 'Workout', programTitle: '', templateId: '', weekIndex: 0, weekLabel: '',
      hardness: null, scheduledDate: '2026-09-13', estimatedMinutes: 30, units: 'kg', rounding: 2.5,
      movements: [{
        id: 'exercise-a', movementId: 'bench', movementName: 'Bench press', role: 'main', orderIndex: 0,
        targetSummary: '1 × 5', sets: [{ id: 'set-a', setIndex: 1, targetReps: 5, actualLoad: 80, actualReps: 5, completed: true }],
      }],
    },
    completedSets: 1, totalSets: 1, topSets: [], accessoryOutcomes: [], decisionReceiptAvailable: true,
    decisions: [{
      id: 'decision-a', movementId: 'bench', movementName: 'Bench press', ruleId: 'linear',
      scope: 'session', status, inputSummary: 'All sets completed.', recommendation: 'Add load next time',
      previousValue: 80, recommendedValue: 82.5,
    }],
  }
}

const receiptKey = accountQueryKeys.sessionReceipt('account-a', 'session-a')
const finishKey = accountQueryKeys.summary('account-a', 'session-a')
let client: QueryClient
beforeEach(() => {
  vi.resetAllMocks()
  api.focused = true
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
})
afterEach(() => client.clear())
const node = () => <QueryClientProvider client={client}><SessionSummaryScreen sessionId="session-a" /></QueryClientProvider>

describe('native persisted workout recap', () => {
  it.each([
    { status: 'accepted', receipt: '80 kg → 82.5 kg' },
    { status: 'dismissed', receipt: 'Kept at 80 kg' },
    { status: 'superseded', receipt: 'Later programme changes replaced this recommendation.' },
  ] as const)('uses authoritative $status decisions on revisit instead of cached pending actions', async ({ status, receipt }) => {
    client.setQueryData(receiptKey, summary())
    let resolve!: (value: SessionSummary) => void
    api.read.mockReturnValueOnce(new Promise<SessionSummary>((done) => { resolve = done }))
    render(node())
    expect(screen.getByText('Loading your recap…')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Apply recommendation' })).toBeNull()
    await act(async () => resolve(summary(status)))
    await screen.findByText(`Decision ${status}`)
    expect(screen.getByText(receipt)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Apply recommendation' })).toBeNull()
    expect(screen.queryByText('Fresh finish feedback')).toBeNull()
  })

  it('hides cached decision actions after a failed read and retries the saved receipt', async () => {
    client.setQueryData(receiptKey, summary())
    api.read.mockRejectedValueOnce(new Error('Receipt unavailable')).mockResolvedValueOnce(summary('dismissed'))
    render(node())
    await screen.findByText('Receipt unavailable')
    expect(screen.queryByRole('button', { name: 'Apply recommendation' })).toBeNull()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Retry' })))
    await screen.findByText('Decision dismissed')
    expect(api.read).toHaveBeenCalledTimes(2)
  })

  it('consumes fresh-finish feedback once while persisting reviewed decision state across a new visit', async () => {
    client.setQueryData(finishKey, summary())
    api.read.mockResolvedValueOnce(summary()).mockResolvedValueOnce(summary('accepted'))
    const first = render(node())
    await screen.findByText('Fresh finish feedback')
    expect(client.getQueryData(finishKey)).toBeUndefined()
    fireEvent.click(screen.getByRole('button', { name: 'Apply recommendation' }))
    await screen.findByText('Decision accepted')
    expect(screen.getByText('80 kg → 82.5 kg')).toBeTruthy()
    expect(client.getQueryData<SessionSummary>(receiptKey)?.decisions[0].status).toBe('accepted')
    first.unmount()
    render(node())
    await screen.findByText('Decision accepted')
    expect(screen.queryByText('Fresh finish feedback')).toBeNull()
    expect(api.read).toHaveBeenCalledTimes(2)
  })

  it('refreshes the saved receipt after returning from another route', async () => {
    api.read.mockResolvedValueOnce(summary()).mockResolvedValueOnce(summary('superseded'))
    const view = render(node())
    await screen.findByRole('button', { name: 'Apply recommendation' })
    api.focused = false
    view.rerender(node())
    expect(screen.queryByText('Saved workout recap')).toBeNull()
    api.focused = true
    view.rerender(node())
    expect(screen.queryByRole('button', { name: 'Apply recommendation' })).toBeNull()
    await screen.findByText('Decision superseded')
    expect(api.read).toHaveBeenCalledTimes(2)
  })

  it('explains missing historical receipts without fabricating pending recommendations', async () => {
    api.read.mockResolvedValue({ ...summary(), decisions: [], decisionReceiptAvailable: false })
    render(node())
    await screen.findByText('Progression details are unavailable for this older workout.')
    expect(screen.queryByRole('button', { name: 'Apply recommendation' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Review current choices in Your Plan' }))
    await waitFor(() => expect(api.navigate).toHaveBeenCalledWith('/(tabs)/program'))
  })

  it('fresh-reads history receipts, preserves the finish marker and returns from sharing to one recap', async () => {
    client.setQueryData(receiptKey, summary())
    client.setQueryData(finishKey, summary())
    api.read.mockResolvedValue(summary('accepted'))
    render(<QueryClientProvider client={client}><SessionSummarySheet sessionId="session-a" user={{ id: 'account-a' } as User} onClose={vi.fn()} /></QueryClientProvider>)
    expect(screen.getByText('Loading your recap…')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Apply recommendation' })).toBeNull()
    await screen.findByText('Decision accepted')
    expect(screen.queryByText('Fresh finish feedback')).toBeNull()
    expect(client.getQueryData(finishKey)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Share workout' }))
    expect(screen.queryByText('Saved workout recap')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Back to summary' }))
    expect(screen.getAllByText('Saved workout recap')).toHaveLength(1)
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.queryByText('Fresh finish feedback')).toBeNull()
  })

  it('hides cached history actions on read failure and retries unavailable legacy receipts honestly', async () => {
    client.setQueryData(receiptKey, summary())
    api.read.mockRejectedValueOnce(new Error('Receipt unavailable')).mockResolvedValueOnce({ ...summary(), decisions: [], decisionReceiptAvailable: false })
    render(<QueryClientProvider client={client}><SessionSummarySheet sessionId="session-a" user={{ id: 'account-a' } as User} onClose={vi.fn()} /></QueryClientProvider>)
    await screen.findByText('Receipt unavailable')
    expect(screen.queryByRole('button', { name: 'Apply recommendation' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Share workout' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Retry summary' }))
    await screen.findByText('Progression details are unavailable for this older workout.')
    expect(screen.queryByRole('button', { name: 'Apply recommendation' })).toBeNull()
  })
})
