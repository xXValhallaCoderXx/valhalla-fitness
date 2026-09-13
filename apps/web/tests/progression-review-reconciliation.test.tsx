import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProgressionDecision } from '~/domains/program'
import type { Unit } from '~/shared/types'

const api = vi.hoisted(() => ({ resolve: vi.fn(), resolveAll: vi.fn(), notify: vi.fn() }))
vi.mock('@mantine/notifications', () => ({ notifications: { show: api.notify } }))
vi.mock('@mantine/core', () => ({
  Button: ({ children, onClick, disabled, loading }: { children: ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean }) =>
    <button onClick={onClick} disabled={disabled || loading}>{children}</button>,
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Modal: ({ opened, children }: { opened: boolean; children: ReactNode }) => opened ? <div role="dialog">{children}</div> : null,
}))
vi.mock('~/components', () => {
  const Block = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return { Caption: Block, Heading: Block, Panel: Block, Text: Block, FormulaChip: Block, SectionLabel: Block }
})
vi.mock('~/domains/account/components', () => ({ useExperienceMode: () => ({ mode: 'guided', isFull: false, showFormulas: false }) }))
vi.mock('~/domains/account/components/AccountIdentityProvider', () => ({ useRequiredAccountId: () => 'account-a' }))
vi.mock('~/domains/account/queries', () => ({ meQueryOptions: () => ({ queryKey: ['profile'], queryFn: async () => ({ units: 'kg' }) }) }))
vi.mock('~/domains/program/server/program-functions', () => ({
  resolveProgressionDecisionFn: api.resolve,
  resolveProgressionDecisionsFn: api.resolveAll,
}))
vi.mock('~/domains/program/components/PendingReviewSurfaces', () => ({ PendingReviewAlert: () => null, PendingReviewGate: () => null }))
vi.mock('~/domains/feedback/components/DecisionFeedback', () => ({
  DecisionFeedbackTrigger: ({ decision }: { decision: ProgressionDecision }) => <span>Feedback status: {decision.status}</span>,
}))

import { PendingProgressionReviewModal } from '~/domains/program/components/PendingReview'

const pending: ProgressionDecision = {
  id: 'decision-a', movementId: 'bench', movementName: 'Bench press', ruleId: 'linear',
  scope: 'session', status: 'pending', inputSummary: 'All sets completed.',
  recommendation: 'Add load next time', previousValue: 80, recommendedValue: 82.5,
}
let client: QueryClient
let root: Root
let host: HTMLDivElement
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  client.clear()
  host.remove()
  vi.unstubAllGlobals()
})
async function settle(action: () => void) {
  await act(async () => {
    action()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}
const show = (decisions: ProgressionDecision[], units?: Unit) => settle(() => root.render(
  <QueryClientProvider client={client}>
    <PendingProgressionReviewModal opened decisions={decisions} units={units} onClose={() => {}} />
  </QueryClientProvider>,
))
function buttons(name: RegExp) {
  return Array.from(host.querySelectorAll('button')).filter((button) => name.test(button.textContent ?? ''))
}
function click(label: string) {
  const button = Array.from(host.querySelectorAll('button')).find((item) => item.textContent === label)
  if (!button) throw new Error(`Missing button: ${label}`)
  button.click()
}

describe('open progression review reconciliation', () => {
  it('uses saved workout units for row and bulk labels when the current profile uses different units', async () => {
    await show([pending], 'lb')
    await vi.waitFor(() => expect(client.getQueryData(['profile'])).toEqual({ units: 'kg' }))
    expect(host.textContent).toContain('80 lb')
    expect(host.textContent).toContain('82.5 lb')
    expect(buttons(/^Accept \+2\.5 lb$/)).toHaveLength(1)
    expect(buttons(/^Accept all \+2\.5 lb$/)).toHaveLength(1)
    expect(host.textContent).not.toContain('kg')
  })

  it.each([
    { status: 'accepted', badge: 'Accepted', confirmation: 'Next block uses 82.5 kg' },
    { status: 'dismissed', badge: 'Kept', confirmation: 'Staying at 80 kg this block' },
    { status: 'superseded', badge: 'Superseded', confirmation: 'Later programme changes replaced this recommendation.' },
  ] as const)('removes stale actions when a lost response is followed by an authoritative $status receipt', async ({ status, badge, confirmation }) => {
    api.resolve.mockRejectedValueOnce(new Error('Response lost'))
    await show([pending])
    await settle(() => click('Accept +2.5 kg'))
    await vi.waitFor(() => expect(api.notify).toHaveBeenCalledWith(expect.objectContaining({ title: 'Could not confirm decision' })))
    await show([{ ...pending, status }])
    expect(host.textContent).toContain(badge)
    expect(host.textContent).toContain(confirmation)
    expect(host.textContent).toContain(`Feedback status: ${status}`)
    expect(buttons(/^Accept/)).toHaveLength(0)
    expect(buttons(/^Keep/)).toHaveLength(0)
    expect(buttons(/^Done$/)).toHaveLength(1)
  })

  it('retains acknowledged rows for pending-only callers without treating missing rows as acceptance', async () => {
    await show([pending])
    await show([])
    expect(host.textContent).toContain('Pending')
    api.resolve.mockResolvedValueOnce([])
    await settle(() => click('Accept +2.5 kg'))
    await vi.waitFor(() => expect(host.textContent).toContain('Accepted'))
    expect(host.textContent).toContain('Feedback status: accepted')
    await show([])
    expect(host.textContent).toContain('Accepted')
  })

  it('snapshots only pending decisions and lets newer terminal status override a local acknowledgement', async () => {
    api.resolve.mockResolvedValueOnce([])
    const older = { ...pending, id: 'older', movementName: 'Old recommendation', status: 'accepted' as const }
    await show([pending, older])
    expect(host.textContent).not.toContain('Old recommendation')
    await settle(() => click('Accept +2.5 kg'))
    await vi.waitFor(() => expect(host.textContent).toContain('Accepted'))
    await show([{ ...pending, status: 'superseded' }, older])
    expect(host.textContent).toContain('Superseded')
    expect(host.textContent).not.toContain('Accepted')
  })
})
