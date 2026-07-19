import { fireEvent, render, screen } from '@testing-library/react-native'
import type { MovementSlot, SetLog } from '@sheetless/core'
import { SetLogger } from '@/features/session/SetLogger'

const set: SetLog = { id: 'set-1', setIndex: 1, targetLoad: 100, targetReps: 5, completed: false }
const movement: MovementSlot = {
  id: 'exercise-1',
  movementId: 'squat',
  movementName: 'Squat',
  role: 'main',
  orderIndex: 0,
  targetSummary: '100 kg × 5',
  sets: [set],
}

describe('SetLogger', () => {
  it('retains edited values when save fails and exposes retry', () => {
    const onSave = jest.fn()
    const onRetry = jest.fn()
    const view = render(
      <SetLogger movement={movement} set={set} units="kg" rounding={2.5} saving={false} failureMessage={null} onSave={onSave} onRetry={onRetry} />,
    )

    fireEvent.changeText(screen.getByLabelText('Load (kg)'), '107.5')
    fireEvent.changeText(screen.getByLabelText('Reps'), '6')
    fireEvent.press(screen.getByLabelText('2 reps in reserve'))
    fireEvent.press(screen.getByText('Log completed set'))
    expect(onSave).toHaveBeenCalledWith({ actualLoad: 107.5, actualReps: 6, actualRir: 2 })

    view.rerender(
      <SetLogger movement={movement} set={set} units="kg" rounding={2.5} saving={false} failureMessage="Network unavailable" onSave={onSave} onRetry={onRetry} />,
    )
    expect(screen.getByDisplayValue('107.5')).toBeTruthy()
    expect(screen.getByDisplayValue('6')).toBeTruthy()
    fireEvent.press(screen.getByText('Retry this save'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
