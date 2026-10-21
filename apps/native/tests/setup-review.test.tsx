import { isValidElement } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { createNativeSetupDraft } from '@sheetless/domain/program/native-setup-draft'
import { buildProgramSetupSuggestions } from '@sheetless/domain/program/setup-suggestions'
import type { ReviewedProgramStartController } from '../src/features/templates/start/useReviewedProgramStart'
import { themeProviderMock } from './support/theme'

const pending = vi.hoisted(() => vi.fn())
vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('@sheetless/data/program/setup-pending-review', () => ({ getProgramSetupPendingReview: pending }))
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ user }) }))
vi.mock('@/features/templates/setup/SetupFirstWorkout', () => ({ SetupFirstWorkout: () => null }))
vi.mock('@/features/program/progression/ProgressionReviewSheet', () => ({ ProgressionReviewSheet: ({ units, contextLabel, onClose }: { units: string; contextLabel: string; onClose: () => void }) => <div role="dialog">{contextLabel} uses {units}<button onClick={onClose}>Review done</button></div> }))
vi.mock('@/components', () => {
  const Block = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
  return { Text: Block, Caption: Block, Panel: Block, SectionLabel: Block,
    Button: ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) => <button disabled={disabled} onClick={onPress}>{label}</button>,
    ConfirmDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => {
      if (!open) return null
      // Preserve the native View/Text boundary without pretending to test modal layout.
      expect(isValidElement(children) && children.type === Block).toBe(true)
      return <div role="dialog">{children}</div>
    },
  }
})
const { SetupReviewStep } = await import('../src/features/templates/setup/SetupReviewStep')
const user = { id: 'account-a' } as User
const draft = createNativeSetupDraft(user.id, 'draft-a', buildProgramSetupSuggestions({
  templateId: 'plan-a', requiredState: [], units: 'kg', rounding: 2.5, defaults: {}, sessions: [],
}))
let client: QueryClient
beforeEach(() => {
  vi.clearAllMocks()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(() => client.clear())
const controller = (activeSessionId: string | null) => ({
  review: { activeSessionId, activeProgram: null, pendingDecisionIds: ['decision-old'], canStart: false },
  pending: false, frozen: false, loading: false, error: null, ready: false,
  refresh: vi.fn(), requestStart: vi.fn(),
}) as unknown as ReviewedProgramStartController

it('prioritizes Resume when both guards exist and never resolves by starting', () => {
  const onResume = vi.fn()
  const start = controller('workout-a')
  render(<QueryClientProvider client={client}><SetupReviewStep user={user} draft={draft} start={start} onResume={onResume} onEdit={vi.fn()} /></QueryClientProvider>)
  expect(screen.queryByRole('button', { name: 'Review progression' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Resume workout' }))
  expect(onResume).toHaveBeenCalledWith('workout-a')
  expect(pending).not.toHaveBeenCalled()
  expect(start.requestStart).not.toHaveBeenCalled()
})

it('reviews all guarded decisions using each owning plan’s units then refreshes without starting', async () => {
  const start = controller(null)
  pending.mockResolvedValue([{ programId: 'old-plan', title: 'Old pound plan', units: 'lb', decisions: [{ id: 'decision-old' }] }])
  render(<QueryClientProvider client={client}><SetupReviewStep user={user} draft={draft} start={start} onResume={vi.fn()} onEdit={vi.fn()} /></QueryClientProvider>)
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Review progression' })))
  await waitFor(() => expect(pending).toHaveBeenCalledWith({ user }, ['decision-old']))
  fireEvent.click(await screen.findByRole('button', { name: 'Review Old pound plan · 1 changes' }))
  expect(screen.getByRole('dialog').textContent).toContain('Old pound plan uses lb')
  fireEvent.click(screen.getByRole('button', { name: 'Review done' }))
  expect(start.refresh).toHaveBeenCalledOnce()
  expect(start.requestStart).not.toHaveBeenCalled()
})

it('renders the current plan name and history guarantee inside the replacement confirmation', () => {
  const start = controller(null)
  start.replaceOpen = true
  start.review!.activeProgram = { id: 'current-plan', title: 'Current strength plan', stateVersion: 3 }
  render(<QueryClientProvider client={client}><SetupReviewStep user={user} draft={draft} start={start} onResume={vi.fn()} onEdit={vi.fn()} /></QueryClientProvider>)
  expect(screen.getByRole('dialog').textContent).toBe('Current strength plan will be archived. Completed workout history remains available. Your new plan starts only after this confirmation.')
  expect(start.requestStart).not.toHaveBeenCalled()
})
