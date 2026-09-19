import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { useState, type PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import type { MovementSlot, WorkoutSession } from '@sheetless/domain/session/types/session'
import { themeProviderMock } from './support/theme'

vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('@/lib/experience-mode', () => ({ useExperienceMode: () => ({ mode: 'guided', isFull: false, showFormulas: false }) }))
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
import { useWorkoutDrafts } from '../src/features/session/focus/useWorkoutDrafts'
import { useWorkoutNavigation } from '../src/features/session/live/useWorkoutNavigation'

const movement: MovementSlot = {
  id: 'bench-slot', movementId: 'bench', movementName: 'Bench press', role: 'main',
  orderIndex: 0, targetSummary: '2 × 5',
  sets: [1, 2].map((setIndex) => ({ id: `set-${setIndex}`, setIndex, completed: false })),
}
const session = { sessionId: 'workout-1', rounding: 2.5, units: 'kg' } as WorkoutSession
function queryHarness() {
  const client = new QueryClient()
  return { client, wrapper: ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider> }
}

describe('native Focus set controls', () => {
  it('retains an unfinished edit when Focus is unmounted for Overview and another exercise', () => {
    const other = { ...movement, id: 'other-slot', movementId: 'row' }
    function NavigationHarness() {
      const drafts = useWorkoutDrafts('user-1', session.sessionId)
      const [exercise, setExercise] = useState(movement)
      const [overview, setOverview] = useState(false)
      return <>
        <button onClick={() => setOverview(!overview)}>Toggle overview</button>
        <button onClick={() => setExercise(exercise.id === movement.id ? other : movement)}>Switch exercise</button>
        {!overview ? <FocusSetCard key={exercise.id} session={session} movement={exercise}
          set={exercise.sets[0]} setNumber={1} setTotal={2} isSaving={false} saveFailed={false}
          initialDraft={drafts.get(exercise, 1)} onDraftChange={(draft) => drafts.set(exercise, 1, draft)}
          onResetDraft={() => drafts.clear(exercise, 1)}
          onLogSet={vi.fn()} onRirSelected={vi.fn()} /> : null}
      </>
    }
    render(<NavigationHarness />, { wrapper: queryHarness().wrapper })
    fireEvent.change(screen.getByLabelText('Weight'), { target: { value: '77.5' } })
    fireEvent.change(screen.getByLabelText('Reps'), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('radio', { name: '2 reps in reserve' }))
    fireEvent.click(screen.getByText('Toggle overview'))
    fireEvent.click(screen.getByText('Toggle overview'))
    expect((screen.getByLabelText('Weight') as HTMLInputElement).value).toBe('77.5')
    fireEvent.click(screen.getByText('Switch exercise'))
    expect((screen.getByLabelText('Weight') as HTMLInputElement).value).toBe('0')
    fireEvent.click(screen.getByText('Switch exercise'))
    expect((screen.getByLabelText('Weight') as HTMLInputElement).value).toBe('77.5')
    expect((screen.getByLabelText('Reps') as HTMLInputElement).value).toBe('8')
    expect(screen.getByRole('radio', { name: '2 reps in reserve', checked: true })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reset changes' }))
    fireEvent.click(screen.getByText('Toggle overview'))
    fireEvent.click(screen.getByText('Toggle overview'))
    expect((screen.getByLabelText('Weight') as HTMLInputElement).value).toBe('0')
    expect(screen.queryByRole('button', { name: 'Reset changes' })).toBeNull()
  })
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
  it('restores notes, view, exercise, selected set and effort suggestion after leaving the route', async () => {
    const { wrapper } = queryHarness()
    const other = { ...movement, id: 'other-slot', orderIndex: 1 }
    const workout = { ...session, notes: 'Saved note', movements: [movement, other] }
    const useNavigation = () => {
      const navigation = useWorkoutNavigation('user-1', workout)
      const active = workout.movements.find((item) => item.id === navigation.activeMovementId)!
      const focus = useFocusSetState(workout.sessionId, active, navigation.focusStore)
      return { navigation, focus }
    }
    const first = renderHook(useNavigation, { wrapper })
    act(() => {
      first.result.current.navigation.setNotes('Unfinished notes')
      first.result.current.navigation.setMode('overview')
      first.result.current.navigation.setActiveMovementId(other.id)
    })
    await waitFor(() => expect(first.result.current.navigation.activeMovementId).toBe(other.id))
    act(() => {
      first.result.current.focus.carryRirToNextSet(1, 2)
      first.result.current.focus.selectSet(2)
    })
    first.unmount()
    const second = renderHook(useNavigation, { wrapper })
    expect(second.result.current.navigation).toMatchObject({ notes: 'Unfinished notes', mode: 'overview', activeMovementId: other.id })
    expect(second.result.current.focus).toMatchObject({ selectedSetIndex: 2, suggestedRir: 2 })
  })
  it('keeps drafts scoped to the workout, performed exercise and set', async () => {
    const { wrapper } = queryHarness()
    const { result, rerender } = renderHook(({ sessionId }) => useWorkoutDrafts('user-1', sessionId), {
      initialProps: { sessionId: 'workout-1' },
      wrapper,
    })
    const draft = { actualLoad: 77.5, actualReps: 8, actualRir: 2 }
    act(() => result.current.set(movement, 1, draft))
    await waitFor(() => expect(result.current.get(movement, 1)).toEqual(draft))
    expect(result.current.get(movement, 2)).toBeUndefined()
    expect(result.current.get({ ...movement, performedMovementId: 'dumbbell-bench' }, 1)).toBeUndefined()
    rerender({ sessionId: 'workout-2' })
    expect(result.current.get(movement, 1)).toBeUndefined()
    rerender({ sessionId: 'workout-1' })
    expect(result.current.get(movement, 1)).toEqual(draft)
    act(() => result.current.clear(movement, 1))
    await waitFor(() => expect(result.current.get(movement, 1)).toBeUndefined())
  })
  it('restores drafts after route re-entry and clears them with the account cache', async () => {
    const { client, wrapper } = queryHarness()
    const first = renderHook(() => useWorkoutDrafts('user-1', 'workout-1'), { wrapper })
    const draft = { actualLoad: 77.5, actualReps: 8 }
    act(() => first.result.current.set(movement, 1, draft))
    first.unmount()
    const second = renderHook(({ userId }) => useWorkoutDrafts(userId, 'workout-1'), {
      wrapper, initialProps: { userId: 'user-1' },
    })
    expect(second.result.current.get(movement, 1)).toEqual(draft)
    second.rerender({ userId: 'user-2' })
    expect(second.result.current.get(movement, 1)).toBeUndefined()
    act(() => client.clear())
    second.rerender({ userId: 'user-1' })
    expect(second.result.current.get(movement, 1)).toBeUndefined()
  })
  it('restores the selected set after navigating to another movement and back', () => {
    const { result, rerender } = renderHook(({ exercise }) => useFocusSetState('workout-1', exercise), {
      initialProps: { exercise: movement },
    })
    act(() => result.current.selectSet(2))
    rerender({ exercise: { ...movement, id: 'other-slot' } })
    expect(result.current.selectedSetIndex).toBe(1)
    rerender({ exercise: movement })
    expect(result.current.selectedSetIndex).toBe(2)
  })
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
