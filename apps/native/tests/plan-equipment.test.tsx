import { createElement, type ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { ProgramEquipmentModePreview, ProgramInstance } from '@sheetless/domain/program/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgramEquipmentMode } from '../src/features/program/equipment/useProgramEquipmentMode'
import { currentEquipmentSwaps } from '../src/features/program/equipment/equipment-presentation'

const api = vi.hoisted(() => ({ preview: vi.fn(), apply: vi.fn(), invalidate: vi.fn(), seed: vi.fn() }))
vi.mock('@sheetless/data/program/equipment-mode', () => ({
  previewProgramEquipmentMode: api.preview, setProgramEquipmentMode: api.apply,
}))
vi.mock('@/lib/account', () => ({ buildUserContext: (user: User) => ({ user }) }))
vi.mock('@/features/program/program-cache', () => ({
  invalidateProgramStateBestEffort: api.invalidate, seedActiveProgram: api.seed,
}))

const user = { id: 'account-a' } as User
const program = { id: 'plan-a', equipmentMode: 'standard', stateVersion: 3 } as ProgramInstance
const choice = { templateSessionId: 'day-1', slotId: 'slot-1', phaseKey: 'build', role: 'accessory' as const,
  sourceMovementId: 'leg_press', replacementMovementId: 'front_squat', policyRuleId: 'rule-1' }
function preview(overrides: Partial<ProgramEquipmentModePreview> = {}): ProgramEquipmentModePreview {
  return { programId: program.id, currentMode: 'standard', targetMode: 'free_weight',
    expectedStateVersion: 3, policy: { id: 'policy-a', version: '1', checksum: 'checksum', rules: [] },
    changes: [{ ...choice, sessionTitle: 'Legs', phaseLabel: 'Build', sourceMovementName: 'Leg press',
      replacementMovementName: 'Front squat', selectionState: 'defaulted', alternatives: [
        { movementId: 'front_squat', movementName: 'Front squat', policyRuleId: 'rule-1' },
        { movementId: 'goblet_squat', movementName: 'Goblet squat', policyRuleId: 'rule-1' },
      ] }], unresolved: [], canApply: true, ...overrides }
}
function setup(hasActiveSession = false, currentProgram = program, onSaved?: () => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  type Props = { hasActiveSession: boolean; program?: ProgramInstance; user?: User }
  const initialProps: Props = { hasActiveSession, program: currentProgram }
  const view = renderHook((props: Props) => useProgramEquipmentMode({
    user: props.user ?? user, program: props.program ?? currentProgram, hasActiveSession: props.hasActiveSession, onSaved,
  }), { initialProps, wrapper: ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children) })
  return { ...view, client }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
beforeEach(() => { vi.clearAllMocks(); api.preview.mockResolvedValue(preview()); api.invalidate.mockResolvedValue(undefined) })

describe('Plan equipment review lifecycle', () => {
  it.each(['account', 'program', 'unmount'] as const)(
    'ignores a late successful save after %s exit without repopulating cleared caches', async (exit) => {
      const save = deferred<ProgramInstance>()
      api.apply.mockReturnValueOnce(save.promise)
      const onSaved = vi.fn()
      const view = setup(false, program, onSaved)
      act(() => view.result.current.requestReview())
      await waitFor(() => expect(view.result.current.preview).not.toBeNull())
      act(() => view.result.current.apply())
      await waitFor(() => expect(api.apply).toHaveBeenCalledOnce())
      const mutation = view.client.getMutationCache().getAll().find((item) => item.state.status === 'pending')!
      if (exit === 'unmount') view.unmount()
      else view.rerender({ hasActiveSession: false,
        user: exit === 'account' ? { id: 'account-b' } as User : user,
        program: exit === 'program' ? { ...program, id: 'plan-b' } : program })
      view.client.clear()
      await act(async () => save.resolve({ ...program, equipmentMode: 'free_weight', stateVersion: 4 }))
      await waitFor(() => expect(mutation.state.status).toBe('success'))
      expect(api.apply.mock.calls[0]?.[0]).toEqual({ user })
      expect(api.seed).not.toHaveBeenCalled()
      expect(api.invalidate).not.toHaveBeenCalled()
      expect(onSaved).not.toHaveBeenCalled()
      expect(view.client.getQueryCache().getAll()).toHaveLength(0)
    },
  )

  it.each(['account', 'program', 'unmount'] as const)(
    'does not refresh or launch another preview when CONFLICT arrives after %s exit', async (exit) => {
      const save = deferred<ProgramInstance>()
      api.apply.mockReturnValueOnce(save.promise)
      const view = setup()
      act(() => view.result.current.requestReview())
      await waitFor(() => expect(view.result.current.preview).not.toBeNull())
      act(() => view.result.current.apply())
      await waitFor(() => expect(api.apply).toHaveBeenCalledOnce())
      const mutation = view.client.getMutationCache().getAll().find((item) => item.state.status === 'pending')!
      if (exit === 'unmount') view.unmount()
      else view.rerender({ hasActiveSession: false,
        user: exit === 'account' ? { id: 'account-b' } as User : user,
        program: exit === 'program' ? { ...program, id: 'plan-b' } : program })
      await act(async () => save.reject(new Error('CONFLICT')))
      await waitFor(() => expect(mutation.state.status).toBe('error'))
      expect(api.preview).toHaveBeenCalledOnce()
      expect(api.invalidate).not.toHaveBeenCalled()
      expect(api.seed).not.toHaveBeenCalled()
    },
  )

  it('ignores a converged preview from a previous account lifetime, including switching back', async () => {
    const read = deferred<ProgramEquipmentModePreview>()
    api.preview.mockReturnValueOnce(read.promise)
    const onSaved = vi.fn()
    const view = setup(false, program, onSaved)
    act(() => view.result.current.requestReview())
    await waitFor(() => expect(api.preview).toHaveBeenCalledOnce())
    view.rerender({ hasActiveSession: false, user: { id: 'account-b' } as User, program })
    view.rerender({ hasActiveSession: false, user, program })
    await act(async () => read.resolve(preview({ currentMode: 'free_weight' })))
    await waitFor(() => expect(view.result.current.isPreviewing).toBe(false))
    expect(view.result.current.preview).toBeNull()
    expect(view.result.current.currentMode).toBe('standard')
    expect(view.result.current.successMessage).toBeNull()
    expect(api.invalidate).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('does not write a preview error into the next account', async () => {
    const read = deferred<ProgramEquipmentModePreview>()
    api.preview.mockReturnValueOnce(read.promise)
    const view = setup()
    act(() => view.result.current.requestReview())
    await waitFor(() => expect(api.preview).toHaveBeenCalledOnce())
    view.rerender({ hasActiveSession: false, user: { id: 'account-b' } as User, program })
    await act(async () => read.reject(new Error('Old-account preview failed')))
    await waitFor(() => expect(view.result.current.isPreviewing).toBe(false))
    expect(view.result.current.previewError).toBeNull()
    expect(view.result.current.applyError).toBeNull()
  })

  it('keeps a pending transaction open, confirms the saved mode immediately and follows a newer read', async () => {
    let finish!: (saved: ProgramInstance) => void
    api.apply.mockImplementationOnce(() => new Promise<ProgramInstance>((resolve) => { finish = resolve }))
    const onSaved = vi.fn()
    const { result, rerender } = setup(false, program, onSaved)
    act(() => result.current.requestReview())
    await waitFor(() => expect(result.current.preview).not.toBeNull())
    act(() => result.current.apply())
    await waitFor(() => expect(result.current.isApplying).toBe(true))
    act(() => {
      result.current.closeReview()
      result.current.updateChoice(choice, 'goblet_squat')
      result.current.requestReview()
    })
    expect(result.current.preview).not.toBeNull()
    expect(result.current.choices[0]?.replacementMovementId).toBe('front_squat')
    expect(api.preview).toHaveBeenCalledTimes(1)
    act(() => finish({ ...program, equipmentMode: 'free_weight', stateVersion: 4 }))
    await waitFor(() => expect(result.current.currentMode).toBe('free_weight'))
    expect(onSaved).toHaveBeenCalledOnce()
    expect(result.current.preview).toBeNull()
    rerender({ hasActiveSession: false, program: { ...program, stateVersion: 5 } })
    expect(result.current.currentMode).toBe('standard')
  })

  it('restores all equipment using the reviewed version without sending free-weight choices', async () => {
    api.preview.mockResolvedValueOnce(preview({ currentMode: 'free_weight', targetMode: 'standard' }))
    api.apply.mockResolvedValueOnce({ ...program, stateVersion: 4 })
    const { result } = setup(false, { ...program, equipmentMode: 'free_weight' })
    act(() => result.current.requestReview())
    await waitFor(() => expect(result.current.preview).not.toBeNull())
    expect(api.preview.mock.calls[0]?.[1]).toMatchObject({ targetMode: 'standard' })
    act(() => result.current.apply())
    await waitFor(() => expect(result.current.successMessage).toMatch(/All equipment is on/))
    expect(api.apply.mock.calls[0]?.[1]).toEqual({ programId: program.id,
      targetMode: 'standard', expectedStateVersion: 3, freeWeightPolicyVersionId: undefined,
      freeWeightPolicyChecksum: undefined, freeWeightChoices: undefined })
  })

  it('blocks review while a workout is active and blocks apply if one starts during review', async () => {
    const { result, rerender } = setup(true)
    act(() => result.current.requestReview())
    expect(api.preview).not.toHaveBeenCalled()
    rerender({ hasActiveSession: false, program })
    act(() => result.current.requestReview())
    await waitFor(() => expect(result.current.preview).not.toBeNull())
    rerender({ hasActiveSession: true, program })
    act(() => result.current.apply())
    expect(api.apply).not.toHaveBeenCalled()
  })

  it('refreshes a stale review, retains a valid alternative, and requires another explicit Apply', async () => {
    api.apply.mockRejectedValueOnce(new Error('CONFLICT'))
    const { result } = setup()
    act(() => result.current.requestReview())
    await waitFor(() => expect(result.current.preview).not.toBeNull())
    act(() => result.current.updateChoice(choice, 'goblet_squat'))
    api.preview.mockResolvedValueOnce(preview({ expectedStateVersion: 4 }))
    act(() => result.current.apply())
    await waitFor(() => expect(result.current.preview?.expectedStateVersion).toBe(4))
    expect(result.current.choices[0]?.replacementMovementId).toBe('goblet_squat')
    expect(result.current.applyError).toMatch(/Review the refreshed/)
    expect(api.apply).toHaveBeenCalledTimes(1)
    api.apply.mockResolvedValueOnce({ ...program, equipmentMode: 'free_weight', stateVersion: 5 })
    act(() => result.current.apply())
    await waitFor(() => expect(result.current.successMessage).toMatch(/Free weights only is on/))
    expect(api.apply.mock.calls[1]?.[1]).toMatchObject({ expectedStateVersion: 4,
      freeWeightChoices: [expect.objectContaining({ replacementMovementId: 'goblet_squat' })] })
  })

  it('keeps a failed submission review and converges after a committed save with a lost response', async () => {
    api.apply.mockRejectedValueOnce(new Error('Connection lost')).mockRejectedValueOnce(new Error('CONFLICT'))
    const { result } = setup()
    act(() => result.current.requestReview())
    await waitFor(() => expect(result.current.preview).not.toBeNull())
    act(() => result.current.apply())
    await waitFor(() => expect(result.current.applyError).toBe('Connection lost'))
    expect(result.current.preview).not.toBeNull()
    api.preview.mockResolvedValueOnce(preview({ currentMode: 'free_weight' }))
    act(() => result.current.apply())
    await waitFor(() => expect(result.current.successMessage).toBe('The equipment change was already saved.'))
    expect(result.current.preview).toBeNull()
    expect(result.current.currentMode).toBe('free_weight')
    expect(api.apply.mock.calls[0]?.[1]).toEqual(api.apply.mock.calls[1]?.[1])
  })

  it('does not apply unresolved conversions and closes review without a write', async () => {
    api.preview.mockResolvedValueOnce(preview({ canApply: false, unresolved: [{
      templateSessionId: 'day-1', slotId: 'slot-2', phaseKey: 'build',
      sourceMovementId: 'unknown', sourceMovementName: 'Unknown movement',
    }] }))
    const { result } = setup()
    act(() => result.current.requestReview())
    await waitFor(() => expect(result.current.unresolved).toHaveLength(1))
    act(() => result.current.apply())
    expect(api.apply).not.toHaveBeenCalled()
    act(() => result.current.closeReview())
    expect(result.current.preview).toBeNull()
  })
})

describe('current equipment swaps', () => {
  it('counts repeated phase-slot replacements once and hides superseded manual swaps', () => {
    const configured = { ...program, equipmentMode: 'free_weight' as const,
      equipmentModeChoices: [choice, { ...choice, phaseKey: 'peak' }],
      movementOverrides: [{ slotId: choice.slotId, phaseKey: 'build', role: choice.role,
        originalMovementId: choice.sourceMovementId, replacementMovementId: 'goblet_squat', effectiveFromWeekIndex: 0 }] }
    expect(currentEquipmentSwaps(configured)).toHaveLength(1)
    expect(currentEquipmentSwaps({ ...configured, equipmentMode: 'standard' })).toEqual([])
    expect(currentEquipmentSwaps({ ...configured,
      movementOverrides: configured.movementOverrides.map((override) => ({ ...override, phaseKey: '*' })) })).toEqual([])
  })
})
