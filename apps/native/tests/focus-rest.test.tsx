import type { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { MovementSlot, WorkoutSession } from '@sheetless/domain/session/types/session'
import { themeProviderMock } from './support/theme'
vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('@/components', async () => ({
  ...await import('../src/components/Button'),
  ...await import('../src/components/Caption'),
  ...await import('../src/components/SectionLabel'),
  ...await import('../src/components/Text'),
}))
// This checks state presentation, never SVG/layout under the native Vitest adapter.
vi.mock('../src/features/session/focus/FocusRing', () => ({ FocusRing: ({ children }: { children: ReactNode }) => <>{children}</> }))
import { FocusRestCard } from '../src/features/session/focus/FocusRestCard'
import { IDLE_REST, RestTimerStateContext } from '../src/features/session/rest-timer/rest-timer-context'

afterEach(cleanup)
it.each(['97,5', '0'])('shows the retained next-set draft %s during rest, separate from its source', load => {
  const movement: MovementSlot = { id: 'row', movementId: 'dumbbell_row', movementName: 'Row', role: 'accessory', orderIndex: 1,
    targetSummary: '', sets: [{ id: 'r1', setIndex: 1, targetLoad: 95, targetReps: 5, completed: false }] }
  render(<RestTimerStateContext.Provider value={{ ...IDLE_REST, active: true, label: 'Bench Press', secondsLeft: 153, durationSeconds: 180 }}>
    <FocusRestCard session={{ units: 'kg' } as WorkoutSession} movement={movement} setIndex={1}
      input={{ load, reps: '7', rir: null }} complete={false} receipt={null} />
  </RestTimerStateContext.Provider>)
  expect(screen.getByText(`${load} kg × 7`)).toBeTruthy()
  expect(screen.queryByText('95 kg × 5')).toBeNull()
  expect(screen.getByText('Rest after Bench Press')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Start set 1 now' })).toBeTruthy()
})
