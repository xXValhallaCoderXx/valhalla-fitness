import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MovementSlot } from '@sheetless/domain/session/types/session'
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

import { FocusRirRow } from '../src/features/session/focus/FocusRirRow'
import { useFocusSetState } from '../src/features/session/focus/useFocusSetState'

const movement: MovementSlot = {
  id: 'bench-slot', movementId: 'bench', movementName: 'Bench press', role: 'main',
  orderIndex: 0, targetSummary: '2 × 5',
  sets: [1, 2].map((setIndex) => ({ id: `set-${setIndex}`, setIndex, completed: false })),
}

describe('native Focus set controls', () => {
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

describe('native Focus selection', () => {
  it('retains a selected set across exercises and isolates workouts and performed movements', () => {
    const { result, rerender } = renderHook(({ sessionId, exercise }) => useFocusSetState(sessionId, exercise), {
      initialProps: { sessionId: 'workout-1', exercise: movement },
    })
    act(() => result.current.selectSet(2))
    for (const boundary of [
      { sessionId: 'workout-1', exercise: { ...movement, id: 'other-slot' } },
      { sessionId: 'workout-1', exercise: { ...movement, performedMovementId: 'dumbbell-bench' } },
      { sessionId: 'workout-2', exercise: movement },
    ]) {
      rerender(boundary)
      expect(result.current.selectedSetIndex).toBe(1)
    }
    rerender({ sessionId: 'workout-1', exercise: movement })
    expect(result.current.selectedSetIndex).toBe(2)
  })
})
