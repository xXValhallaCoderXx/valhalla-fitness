import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProgramSetupOptions, ProgramTemplateSummary } from '@sheetless/domain/program/types'
import { themeProviderMock } from './support/theme'

const api = vi.hoisted(() => ({
  user: { id: 'account-a' } as User, mode: 'guided', profileError: false,
  catalogue: vi.fn(), setup: vi.fn(), profileRetry: vi.fn(), push: vi.fn(), back: vi.fn(), replace: vi.fn(), canGoBack: true,
}))
vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('@/lib/session-provider', () => ({ useSession: () => ({ user: api.user }) }))
vi.mock('@/lib/account', () => ({ useMe: () => ({ data: api.profileError ? undefined : { experienceMode: api.mode },
  isError: api.profileError, refetch: api.profileRetry, isFetching: false }) }))
vi.mock('expo-router', () => ({ router: { push: api.push, back: api.back, replace: api.replace, canGoBack: () => api.canGoBack }, useIsFocused: () => true }))
vi.mock('lucide-react-native', () => ({ ChevronRight: () => null }))
vi.mock('@/features/templates/queries', () => ({
  templatesQueryOptions: (user: User) => ({ queryKey: ['templates', user.id], queryFn: () => api.catalogue(user.id), staleTime: Infinity }),
  templateSetupQueryOptions: (user: User, id: string) => ({ queryKey: ['setup', user.id, id], queryFn: () => api.setup(user.id, id), staleTime: Infinity }),
}))
vi.mock('@/features/templates/catalogue/TemplatesLayout', () => ({
  TemplatesLayout: ({ children, footer, onBack }: { children: ReactNode; footer: ReactNode; onBack: () => void }) => <div>
    <button onClick={onBack}>Back to plans</button>{children}{footer}
  </div>,
}))
vi.mock('@/components', async () => {
  const { Button } = await import('../src/components/Button')
  const Block = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return { Button, Heading: Block, Text: Block, Caption: Block, Panel: Block, SectionLabel: Block, Badge: Block,
    EmptyState: ({ title, children }: { title: string; children: ReactNode }) => <div>{title}{children}</div>,
    SheetModal: ({ title, children, footer }: { title: string; children: ReactNode; footer: ReactNode }) => <div role="dialog" aria-label={title}>{children}{footer}</div> }
})

import { TemplateDetailScreen } from '../src/features/templates/TemplateDetailScreen'

const template: ProgramTemplateSummary = {
  id: 'custom-detail', name: 'Local plan', source: 'custom_program', sourceLabel: 'Custom programme',
  origin: 'user_created', description: 'A repeatable strength plan.', daysPerWeek: 3, durationWeeks: 1,
  progressionLabel: 'Working-load progression', complexity: 'Beginner', tags: ['strength'], requiredState: [], available: true,
}
const setup: ProgramSetupOptions = { templateId: template.id, templateName: template.name, origin: 'user_created',
  sessions: [], freeWeightPolicy: null, accessoryCatalog: [], previewWeeks: [{ index: 0, label: 'Week 1',
    phaseKey: 'base', phaseLabel: 'Base', subtitle: 'Base', summary: 'Repeat the three sessions.', hardness: 'Medium',
    sessions: [{ id: 'day-a', label: 'Day 1', title: 'Squat day', estimatedMinutes: 45, movementSummary: 'Squat',
      keyPrescription: '3 × 5', movements: [{ slotId: 'main', templateSlotId: 'main', phaseKey: 'base', phaseLabel: 'Base',
        setupPhaseKey: 'base', role: 'main', roleLabel: 'Main', defaultMovementId: 'squat', defaultMovementName: 'Squat',
        targetSummary: '3 × 5', progressionRuleId: 'simple_linear_completion', replacementOptions: [], requiredEquipment: ['barbell', 'rack'],
        sets: Array.from({ length: 3 }, () => ({ targetLoad: { kind: 'state', stateType: 'working_load' }, targetReps: 5, targetRir: 2 })) }] }] }] }
let client: QueryClient
beforeEach(() => {
  vi.clearAllMocks()
  api.user = { id: 'account-a' } as User
  api.mode = 'guided'
  api.profileError = false
  api.canGoBack = true
  api.catalogue.mockResolvedValue([template])
  api.setup.mockResolvedValue(setup)
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
})
afterEach(() => client.clear())
function mount() { return render(<QueryClientProvider client={client}><TemplateDetailScreen templateId={template.id} /></QueryClientProvider>) }

describe('read-only native plan details', () => {
  it('opens a generic session and hands its exact template to setup without starting a workout', async () => {
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Look at a session before you decide' }))
    expect(screen.getByRole('dialog', { name: 'Week 1, day 1' })).toBeTruthy()
    expect(screen.getByText('3 × 5 · working load · RIR 2')).toBeTruthy()
    expect(screen.getByText(/choose your starting weights during setup/)).toBeTruthy()
    expect(screen.queryByText(/\d+ kg/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Set this plan up' }))
    expect(api.push).toHaveBeenCalledExactlyOnceWith({ pathname: '/template/[templateId]/setup', params: { templateId: 'custom-detail' } })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps prescriptions available on demand in Simple and visible in Advanced', async () => {
    const view = mount()
    await screen.findByRole('button', { name: 'Show prescriptions and progression' })
    expect(screen.queryByText('Main lift, by week')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Show prescriptions and progression' }))
    expect(screen.getByText('Main lift, by week')).toBeTruthy()
    expect(screen.getByText('working load')).toBeTruthy()
    expect(screen.getByText(/Complete every prescribed set/)).toBeTruthy()
    api.mode = 'full'
    view.rerender(<QueryClientProvider client={client}><TemplateDetailScreen templateId={template.id} /></QueryClientProvider>)
    expect(screen.getByText('Main lift, by week')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Set this up' })).toBeTruthy()
  })

  it('does not make a profile failure block browsing and provides its own retry', async () => {
    api.profileError = true
    mount()
    await screen.findByText('Who it suits')
    expect(screen.getByText('Display preference could not load. Showing Simple.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry display preference' }))
    expect(api.profileRetry).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Set this up' })).toBeTruthy()
  })

  it('retries preview failures independently from the catalogue', async () => {
    api.setup.mockRejectedValueOnce(new Error('Preview unavailable'))
    mount()
    await screen.findByText('Preview unavailable')
    expect(screen.getByText('Local plan')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry preview' }))
    await screen.findByRole('button', { name: 'Look at a session before you decide' })
    expect(api.catalogue).toHaveBeenCalledOnce()
    expect(api.setup).toHaveBeenCalledTimes(2)
  })

  it('shows unavailable and missing templates without opening setup or fetching previews', async () => {
    api.catalogue.mockResolvedValueOnce([{ ...template, available: false }])
    const view = mount()
    await screen.findByText('This plan is unavailable')
    expect(screen.queryByRole('button', { name: 'Set this up' })).toBeNull()
    expect(api.setup).not.toHaveBeenCalled()
    view.unmount()
    client.clear()
    api.catalogue.mockResolvedValueOnce([])
    mount()
    await screen.findByText(/Plan not found/)
    expect(api.setup).not.toHaveBeenCalled()
  })

  it('clears an open preview when the account changes and ignores the prior account cache', async () => {
    const view = mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Look at a session before you decide' }))
    api.user = { id: 'account-b' } as User
    api.catalogue.mockResolvedValueOnce([{ ...template, name: 'Other account plan' }])
    await act(async () => view.rerender(<QueryClientProvider client={client}><TemplateDetailScreen templateId={template.id} /></QueryClientProvider>))
    await screen.findByText('Other account plan')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(api.catalogue).toHaveBeenLastCalledWith('account-b')
    await waitFor(() => expect(api.setup).toHaveBeenLastCalledWith('account-b', template.id))
  })

  it('returns through the existing stack and falls back to Plan for a cold deep link', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Back to plans' }))
    expect(api.back).toHaveBeenCalledOnce()
    api.canGoBack = false
    fireEvent.click(screen.getByRole('button', { name: 'Back to plans' }))
    expect(api.replace).toHaveBeenCalledExactlyOnceWith('/program')
  })
})
