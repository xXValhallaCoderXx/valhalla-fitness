import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PropsWithChildren, ReactNode } from 'react'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import { reflectionImprovePrompt, reflectionWinPrompt } from '@sheetless/domain/session/session-reflection'
import { themeProviderMock } from './support/theme'
vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('@/components', async () => ({
  ...await import('../src/components/Button'), ...await import('../src/components/Caption'),
  ...await import('../src/components/SectionLabel'), ...await import('../src/components/Text'),
  ...await import('../src/components/TextInput'),
  SheetModal: ({ open, children, footer, title }: PropsWithChildren<{ open: boolean; footer?: ReactNode; title: string }>) => open ? <div aria-label={title}>{children}{footer}</div> : null,
}))
import { FinishWorkoutSheet } from '../src/features/session/lifecycle/FinishWorkoutSheet'
import { WorkoutLifecycleSheets } from '../src/features/session/lifecycle/WorkoutLifecycleSheets'

describe('native Finish controls', () => {
  it('retains optional effort and collapsed reflection through cancel, reopen and a failed Finish', () => {
    const onFinish = vi.fn(), onCancel = vi.fn()
    const props = { open: true, completedSetCount: 1, incompleteSetCount: 2, editedSetCount: 1, isPending: false, onCancel, onFinish }
    const { rerender } = render(<FinishWorkoutSheet {...props} />)
    expect(screen.queryByLabelText(reflectionWinPrompt)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Effort 7 of 10' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add a reflection' }))
    fireEvent.change(screen.getByLabelText(reflectionWinPrompt), { target: { value: 'Good control' } })
    fireEvent.change(screen.getByLabelText(reflectionImprovePrompt), { target: { value: 'More rest' } })
    fireEvent.click(screen.getByRole('button', { name: 'Keep logging' }))
    expect(onCancel).toHaveBeenCalledOnce()
    rerender(<FinishWorkoutSheet {...props} open={false} />)
    rerender(<FinishWorkoutSheet {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Finish workout' }))
    expect(onFinish).toHaveBeenCalledWith({ sessionRpe: 7, reflectionWin: 'Good control', reflectionImprove: 'More rest' })
    rerender(<FinishWorkoutSheet {...props} error="Connection lost" />)
    expect((screen.getByLabelText(reflectionWinPrompt) as HTMLInputElement).value).toBe('Good control')
    fireEvent.click(screen.getByRole('button', { name: 'Finish workout' }))
    expect(onFinish.mock.lastCall?.[0].sessionRpe).toBe(7)
    expect(screen.getByText(/Finishing omits those edits/)).toBeTruthy()
    rerender(<FinishWorkoutSheet {...props} blocked />)
    fireEvent.click(screen.getByRole('button', { name: 'Finish workout' }))
    expect(onFinish).toHaveBeenCalledTimes(2)
  })
  it('offers Keep logging or deliberate discard for zero completed sets, never Finish', () => {
    const finish = vi.fn(), discard = vi.fn(), keep = vi.fn(), confirm = vi.fn()
    const session = { startedAt: null, isAdHoc: false } as WorkoutSession
    const props = { session, discardOpen: false, discardPending: false, discardError: null, onDiscard: confirm,
      onCloseDiscard: vi.fn(), finishOpen: true, finishPending: false, finishError: null, finishBlocked: false,
      completedSetCount: 0, incompleteSetCount: 12, editedSetCount: 0, onFinish: finish, onCloseFinish: keep, onEmptyDiscard: discard }
    const { rerender } = render(<WorkoutLifecycleSheets {...props} />)
    expect(screen.queryByRole('button', { name: 'Finish workout' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Keep logging' }))
    expect(keep).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Discard attempt' }))
    expect(discard).toHaveBeenCalledOnce()
    expect(confirm).not.toHaveBeenCalled()
    rerender(<WorkoutLifecycleSheets {...props} finishOpen={false} discardOpen />)
    expect(screen.getByText(/same planned workout will remain next/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Discard attempt' }))
    expect(confirm).toHaveBeenCalledOnce()
    expect(finish).not.toHaveBeenCalled()
  })
})
