import { isValidElement, useEffect, useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@sheetless/domain/account/types'
import type { ProgramSetupOptions, ProgramTemplateSummary } from '@sheetless/domain/program/types'
import { buildProgramSetupSuggestions } from '@sheetless/domain/program/setup-suggestions'
import { createNativeSetupDraft, type NativeProgramSetupDraft } from '@sheetless/domain/program/native-setup-draft'
import { themeProviderMock } from './support/theme'

const api = vi.hoisted(() => ({
  focus: true, canBack: true, back: vi.fn(), replace: vi.fn(), params: vi.fn(), clear: vi.fn(), review: vi.fn(),
  suggestions: vi.fn(), setup: vi.fn(), templates: vi.fn(), prevent: vi.fn(),
}))
vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('expo-router', () => ({ useIsFocused: () => api.focus, router: { back: api.back, replace: api.replace, setParams: api.params, canGoBack: () => api.canBack, dismissTo: api.replace } }))
vi.mock('expo-router/react-navigation', () => ({ usePreventRemove: api.prevent }))
vi.mock('@/features/templates/start/useReviewedProgramStart', () => ({ useReviewedProgramStart: api.review }))
vi.mock('@/features/templates/setup-suggestions', () => ({ programSetupSuggestionsQueryOptions: (_user: unknown, templateId: string) => ({ queryKey: ['suggestions', templateId], queryFn: () => api.suggestions(templateId) }) }))
vi.mock('@/features/templates/queries', () => ({
  templateSetupQueryOptions: (_user: unknown, templateId: string) => ({ queryKey: ['setup', templateId], queryFn: api.setup }),
  templatesQueryOptions: () => ({ queryKey: ['templates'], queryFn: api.templates }),
}))
vi.mock('@/features/templates/setup/SetupLayout', () => ({ SetupLayout: ({ step, children, footer }: { step: string; children: React.ReactNode; footer: React.ReactNode }) => <div><h1>{step}</h1>{children}{footer}</div> }))
vi.mock('@/features/templates/setup/SetupEquipmentStep', () => ({ SetupEquipmentStep: () => <div>Equipment choices</div> }))
vi.mock('@/features/templates/setup/SetupReviewStep', () => ({ SetupReviewStep: ({ draft, onEdit }: { draft: NativeProgramSetupDraft; onEdit: (step: string) => void }) => <div>Review {draft.rawValues.bench_press_training_max}<button onClick={() => onEdit('numbers')}>Edit numbers</button></div> }))
vi.mock('@/components', () => {
  const Block = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
  return { Text: Block, Caption: Block, Panel: Block, SectionLabel: Block,
    Button: ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) => <button disabled={disabled} onClick={onPress}>{label}</button>,
    TextInput: ({ value, onChangeText, accessibilityLabel }: { value: string; onChangeText: (value: string) => void; accessibilityLabel: string }) => <input aria-label={accessibilityLabel} value={value} onChange={(event) => onChangeText(event.target.value)} />,
    SegmentedControl: ({ options, onChange, disabled }: { options: { value: string; label: string }[]; onChange: (value: string) => void; disabled?: boolean }) => <div>{options.map((option) => <button key={option.value} disabled={disabled} onClick={() => onChange(option.value)}>{option.label}</button>)}</div>,
    ConfirmDialog: ({ open, title, children, confirmLabel, cancelLabel, onConfirm, onCancel }: { open: boolean; title: string; children: React.ReactNode; confirmLabel: string; cancelLabel: string; onConfirm: () => void; onCancel: () => void }) => {
      if (!open) return null
      // Native dialog bodies live in a View, so interpolated prose needs a Text owner.
      expect(isValidElement(children) && children.type === Block).toBe(true)
      return <div role="dialog"><h2>{title}</h2>{children}<button onClick={onConfirm}>{confirmLabel}</button><button onClick={onCancel}>{cancelLabel}</button></div>
    },
  }
})
const { TemplateStartSetup } = await import('../src/features/templates/setup/TemplateStartSetup')
const snapshot = (templateId = 'first') => buildProgramSetupSuggestions({
  templateId, units: 'kg', rounding: 2.5, defaults: { bench_press_one_rep_max: 100 }, sessions: [],
  requiredState: [{ key: 'bench_press_training_max', movementId: 'bench_press', type: 'training_max' }],
})
const template: ProgramTemplateSummary = { id: 'first', name: 'Example', daysPerWeek: 3, available: true,
  requiredState: snapshot().stateValues, source: 'linear_strength', sourceLabel: 'Linear', origin: 'system_default',
  description: 'Example plan', progressionLabel: 'Weekly', complexity: 'Beginner', tags: [] }
const setup = { templateId: 'first', previewWeeks: [], sessions: [], freeWeightPolicy: null, accessoryCatalog: [] } as unknown as ProgramSetupOptions
let client: QueryClient
let latest: NativeProgramSetupDraft
function Harness() {
  const [draft, update] = useState(() => createNativeSetupDraft('account-a', 'draft-a', snapshot()))
  useEffect(() => { latest = draft }, [draft])
  return <TemplateStartSetup user={{ id: 'account-a' } as User} profile={{ units: 'kg', equipmentProfile: [], experienceMode: 'guided' } as unknown as UserProfile}
    template={{ ...template, id: draft.templateId }} setup={setup} familyMembers={[template, { ...template, id: 'second', daysPerWeek: 4 }]}
    draft={draft} update={update} clear={api.clear} />
}
beforeEach(() => {
  vi.clearAllMocks()
  api.focus = true
  api.canBack = true
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  api.suggestions.mockImplementation(async (id) => snapshot(id))
  api.setup.mockResolvedValue(setup)
  api.templates.mockResolvedValue([template])
  api.review.mockReturnValue({ pending: false, frozen: false, ready: true, review: null, error: null, requestStart: vi.fn(), refresh: vi.fn() })
})
afterEach(() => client.clear())
const mount = () => render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>)

it('keeps exact raw manual edits through the four ordered steps and Back without starting', async () => {
  mount()
  expect(screen.getByRole('heading', { name: 'schedule' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expect(screen.getByRole('heading', { name: 'numbers' })).toBeTruthy()
  const input = screen.getByRole('textbox', { name: 'Bench Press starting kg' })
  fireEvent.change(input, { target: { value: 'bad input' } })
  expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.change(input, { target: { value: '77.250' } })
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expect(screen.getByRole('heading', { name: 'equipment' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Review plan' }))
  expect(screen.getByRole('heading', { name: 'review' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Edit numbers' }))
  expect((screen.getByRole('textbox', { name: 'Bench Press starting kg' }) as HTMLInputElement).value).toBe('77.250')
  expect(api.review.mock.results.at(-1)?.value.requestStart).not.toHaveBeenCalled()
})

it('changes schedules only after confirmation and keeps units, rounding, and percentages', async () => {
  mount()
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  fireEvent.click(screen.getByRole('button', { name: 'Increase training max' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Bench Press starting kg' }), { target: { value: '76' } })
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  fireEvent.click(screen.getByRole('button', { name: '4 days' }))
  expect(screen.getByRole('dialog').textContent).toContain('Changing the schedule resets starting numbers')
  expect(screen.getByRole('dialog').textContent).toContain('Your units, rounding, and percentages are kept.')
  expect(api.suggestions).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
  expect(latest.rawValues.bench_press_training_max).toBe('76')
  fireEvent.click(screen.getByRole('button', { name: '4 days' }))
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Change schedule' })))
  await waitFor(() => expect(latest.templateId).toBe('second'))
  expect(latest.trainingMaxPercent).toBe(91)
  expect(latest.manualKeys).toEqual([])
  expect(latest.rawValues.bench_press_training_max).toBe('90')
  expect(api.params).toHaveBeenCalledWith({ templateId: 'second', draftId: 'draft-a' })
})

it('releases Back interception while blurred and offers a safe direct-entry Back', () => {
  api.canBack = false
  const view = mount()
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(api.replace).toHaveBeenCalledWith('/(tabs)/program')
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expect(api.prevent.mock.calls.at(-1)?.[0]).toBe(true)
  api.focus = false
  view.rerender(<QueryClientProvider client={client}><Harness /></QueryClientProvider>)
  expect(api.prevent.mock.calls.at(-1)?.[0]).toBe(false)
})

it('reloads a stale setup only after consent and resets its failed intent with the latest defaults', async () => {
  const view = mount()
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Bench Press starting kg' }), { target: { value: '76' } })
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  fireEvent.click(screen.getByRole('button', { name: 'Review plan' }))
  const refresh = vi.fn()
  api.review.mockReturnValue({ pending: false, frozen: true, needsFreshReview: true, error: 'This plan changed.', ready: false, refresh })
  view.rerender(<QueryClientProvider client={client}><Harness /></QueryClientProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'Reload setup' }))
  expect(screen.getByRole('dialog').textContent).toContain('Reloading uses the newest programme definition and resets starting numbers')
  expect(api.suggestions).not.toHaveBeenCalled()
  expect(latest.rawValues.bench_press_training_max).toBe('76')
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Reload and reset' })))
  await waitFor(() => expect(api.suggestions).toHaveBeenCalledWith('first'))
  expect(refresh).toHaveBeenCalledOnce()
  expect(api.setup).toHaveBeenCalledOnce()
  expect(api.templates).toHaveBeenCalledOnce()
  expect(latest.rawValues.bench_press_training_max).toBe('90')
  expect(latest.step).toBe('schedule')
  expect(latest.submission).toBeNull()
})

it('explains abandonment in native text before the user chooses to keep editing', () => {
  mount()
  fireEvent.click(screen.getByRole('button', { name: 'Abandon setup' }))
  expect(screen.getByRole('dialog').textContent).toContain('Your unsaved setup will be removed. Your current plan and completed workouts stay as they are.')
  fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(api.clear).not.toHaveBeenCalled()
})
