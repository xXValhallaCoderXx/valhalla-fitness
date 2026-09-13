import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MovementSlot, WorkoutSession } from '@sheetless/domain/session/types/session'
import { themeProviderMock } from './support/theme'

vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('lucide-react-native', () => ({ Minus: () => null, Plus: () => null }))
vi.mock('@/components', async () => ({
  ...await import('../src/components/Button'),
  ...await import('../src/components/Caption'),
  ...await import('../src/components/SectionLabel'),
  ...await import('../src/components/Text'),
  ...await import('../src/components/SegmentedControl'),
}))

import { FocusSetCard, type SetDraft } from '../src/features/session/focus/FocusSetCard'
import { FocusRirRow } from '../src/features/session/focus/FocusRirRow'
import { useFocusSetState } from '../src/features/session/focus/useFocusSetState'

const movement: MovementSlot = {
  id: 'bench-slot', movementId: 'bench', movementName: 'Bench press', role: 'main',
  orderIndex: 0, targetSummary: '2 × 5',
  sets: [1, 2].map((setIndex) => ({ id: `set-${setIndex}`, setIndex, completed: false })),
}
const session = { sessionId: 'workout-1', rounding: 2.5, units: 'kg' } as WorkoutSession

describe('native Focus set controls', () => {
  it('retains numbers through undo, saving, failed retry, and an edited retry', () => {
    const onLogSet = vi.fn<(draft: SetDraft) => void>()
    const initialSet = { ...movement.sets[0], completed: true, actualLoad: 82.5, actualReps: 5, actualRir: 2 }
    const props = {
      session, movement, set: initialSet, setNumber: 1, setTotal: 2, isSaving: false,
      saveFailed: false, onLogSet, onRirSelected: vi.fn(),
    }
    const { rerender } = render(<FocusSetCard {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Mark incomplete' }))
    const undone = { actualLoad: 82.5, actualReps: 5, actualRir: 2, completed: false }
    expect(onLogSet).toHaveBeenLastCalledWith(undone)

    rerender(<FocusSetCard {...props} set={{ ...initialSet, ...undone, syncState: 'saving' }} isSaving />)
    fireEvent.click(screen.getByTestId('focus-log-set'))
    expect(onLogSet).toHaveBeenCalledTimes(1)

    rerender(<FocusSetCard {...props} set={{ ...initialSet, ...undone, syncState: 'syncFailed' }} saveFailed />)
    expect((screen.getByLabelText('Weight') as HTMLInputElement).value).toBe('82.5')
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }))
    expect(onLogSet).toHaveBeenLastCalledWith(undone)

    fireEvent.change(screen.getByLabelText('Weight'), { target: { value: '80' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(onLogSet).toHaveBeenLastCalledWith({ ...undone, actualLoad: 80 })
    expect(screen.queryByRole('button', { name: 'Mark incomplete' })).toBeNull()
  })

  it('announces the RIR choice and blocks changes while saving', () => {
    const onChange = vi.fn()
    const { rerender } = render(<FocusRirRow value={4} onChange={onChange} />)
    expect(screen.getByRole('radiogroup', { name: 'Actual reps in reserve' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: '3 or more reps in reserve', checked: true })).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: '1 rep in reserve' }))
    expect(onChange).toHaveBeenLastCalledWith(1)
    rerender(<FocusRirRow value={1} onChange={onChange} disabled />)
    fireEvent.click(screen.getByRole('radio', { name: '0 reps in reserve' }))
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})

describe('native Focus RIR suggestions', () => {
  it('carries to the next unfinished set only within the same workout, slot, and performed movement', () => {
    const { result, rerender } = renderHook(({ sessionId, exercise }) => useFocusSetState(sessionId, exercise), {
      initialProps: { sessionId: 'workout-1', exercise: movement },
    })
    act(() => {
      result.current.carryRirToNextSet(1, 2)
      result.current.selectSet(2)
    })
    expect(result.current.suggestedRir).toBe(2)

    for (const boundary of [
      { sessionId: 'workout-1', exercise: { ...movement, id: 'other-slot' } },
      { sessionId: 'workout-1', exercise: { ...movement, performedMovementId: 'dumbbell-bench' } },
      { sessionId: 'workout-2', exercise: movement },
    ]) {
      rerender(boundary)
      act(() => result.current.selectSet(2))
      expect(result.current.suggestedRir).toBeUndefined()
    }
    rerender({ sessionId: 'workout-1', exercise: movement })
    act(() => result.current.selectSet(2))
    expect(result.current.suggestedRir).toBe(2)
  })

  it('does not replace an explicit RIR already recorded on the next set', () => {
    const recorded = { ...movement, sets: [movement.sets[0], { ...movement.sets[1], actualRir: 1 }] }
    const { result } = renderHook(() => useFocusSetState('workout-1', recorded))
    act(() => {
      result.current.carryRirToNextSet(1, 3)
      result.current.selectSet(2)
    })
    expect(result.current.suggestedRir).toBeUndefined()
  })
})
