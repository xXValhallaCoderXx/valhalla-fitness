import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { WorkoutSession } from '@sheetless/core'
import { queryKeys } from '@sheetless/api'
import { api } from '@/api/client'
import { SessionScreen } from '@/features/session/SessionScreen'

jest.mock('@/api/client', () => ({
  api: { getSession: jest.fn(), updateSet: jest.fn() },
}))

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '33333333-3333-4333-8333-333333333333'),
}))

const getSession = api.getSession as jest.Mock
const updateSet = api.updateSet as jest.Mock

const initial: WorkoutSession = {
  id: 'planned-a',
  title: 'Day A',
  programTitle: 'Linear Strength',
  templateId: 'linear',
  weekIndex: 0,
  weekLabel: 'Week 1',
  hardness: 'Medium',
  scheduledDate: '2026-07-18',
  estimatedMinutes: 45,
  units: 'kg',
  rounding: 2.5,
  sessionId: '11111111-1111-4111-8111-111111111111',
  status: 'in_progress',
  movements: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      movementId: 'squat',
      movementName: 'Squat',
      role: 'main',
      orderIndex: 0,
      targetSummary: '100 kg × 5',
      sets: [
        {
          id: 'set-1',
          exerciseLogId: '22222222-2222-4222-8222-222222222222',
          setIndex: 1,
          targetLoad: 100,
          targetReps: 5,
          completed: false,
        },
        {
          id: 'set-2',
          exerciseLogId: '22222222-2222-4222-8222-222222222222',
          setIndex: 2,
          targetLoad: 100,
          targetReps: 5,
          completed: false,
        },
      ],
    },
  ],
}

const authoritative: WorkoutSession = {
  ...initial,
  movements: initial.movements.map((movement) => ({
    ...movement,
    sets: movement.sets.map((set) =>
      set.setIndex === 1
        ? { ...set, actualLoad: 107.5, actualReps: 6, actualRir: 2, completed: true, syncState: 'synced' }
        : set),
  })),
}

describe('SessionScreen set mutation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getSession.mockResolvedValue(initial)
  })

  it('keeps a failed optimistic draft selected, retries the same mutation, then advances on success', async () => {
    updateSet.mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValueOnce(authoritative)
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { gcTime: Infinity, retry: false },
        mutations: { gcTime: Infinity, retry: false },
      },
    })
    const view = render(
      <QueryClientProvider client={queryClient}>
        <SessionScreen sessionId={initial.sessionId} />
      </QueryClientProvider>,
    )

    await waitFor(() => expect(screen.getByDisplayValue('100')).toBeTruthy())
    fireEvent.changeText(screen.getByLabelText('Load (kg)'), '107.5')
    fireEvent.changeText(screen.getByLabelText('Reps'), '6')
    fireEvent.press(screen.getByLabelText('2 reps in reserve'))
    fireEvent.press(screen.getByText('Log completed set'))

    await waitFor(() => expect(screen.getByText('Network unavailable')).toBeTruthy())
    expect(screen.getByDisplayValue('107.5')).toBeTruthy()
    expect(screen.getByDisplayValue('6')).toBeTruthy()
    expect(screen.getByLabelText('Set 1').props.accessibilityState.selected).toBe(true)

    fireEvent.press(screen.getByText('Retry this save'))
    await waitFor(() => expect(screen.getByLabelText('Set 2').props.accessibilityState.selected).toBe(true))
    expect(updateSet).toHaveBeenCalledTimes(2)
    expect(updateSet.mock.calls[1]).toEqual(updateSet.mock.calls[0])
    expect(queryClient.getQueryData(queryKeys.session(initial.sessionId))).toEqual(authoritative)
    view.unmount()
    queryClient.clear()
  })
})
