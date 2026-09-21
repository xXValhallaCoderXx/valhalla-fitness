import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PlannedSession } from '@sheetless/domain/session/types'
import { themeProviderMock } from './support/theme'
const navigate = vi.hoisted(() => vi.fn())
vi.mock('expo-router', () => ({ router: { push: navigate, navigate } }))
vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('lucide-react-native', () => ({ Info: () => null, Plus: () => null }))
vi.mock('@/features/program/return/ReturnGuideCard', () => ({ ReturnGuideCard: () => null }))
vi.mock('@/features/session/today/StartBlankWorkoutButton', () => ({ StartBlankWorkoutButton: () => <button>Start blank workout</button> }))
vi.mock('@/components', async () => {
  const { Button } = await import('../src/components/Button')
  const Block = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
  return { Button, Panel: Block, Heading: Block, Text: Block, Caption: Block, Badge: Block, SectionLabel: Block,
    SheetModal: ({ children, title, onClose, footer }: { children: React.ReactNode; title: string; onClose: () => void; footer?: React.ReactNode }) =>
      <div role="dialog" aria-label={title}>{children}{footer}<button onClick={onClose}>Close</button></div> }
})
import { TodayPlannedSessionCard } from '../src/features/session/today/TodayPlannedSessionCard'
import { LastWorkoutCard } from '../src/features/session/today/LastWorkoutCard'
import { TodayHeader } from '../src/features/session/today/TodayHeader'

const session: PlannedSession = { id: 'planned', title: 'Workout A', programTitle: 'Programme', templateId: 'template',
  weekIndex: 0, weekLabel: 'Week 1', hardness: null, scheduledDate: '2026-09-22', estimatedMinutes: 45, units: 'kg', rounding: 2.5,
  movements: ['Bench', 'Row', 'Squat', 'Press', 'Curl', 'Lunge'].map((name, index) => ({ id: `slot-${index}`, movementId: `movement-${index}`,
    movementName: name, orderIndex: index, role: 'main', targetSummary: `Authored ${name} prescription`,
    sets: [1, 2, 3].map(setIndex => ({ id: `${index}-${setIndex}`, exerciseLogId: `slot-${index}`, setIndex,
      completed: false, targetLoad: 80, targetReps: 5, targetRir: 2,
      sourcePrescription: { targetLoad: { kind: 'fixed', kg: 80 } } })),
  })) }
const props = { session, units: 'kg' as const, completedToday: false, pendingDecisionCount: 0,
  isStarting: false, startError: null, onStart: vi.fn(), onReview: vi.fn() }

describe('native Today contract', () => {
  it('opens workout options deliberately and preserves the active-session entry guard', () => {
    navigate.mockClear()
    const view = render(<TodayHeader date="2026-09-20" />)
    fireEvent.click(screen.getByRole('button', { name: 'Workout options' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    view.rerender(<TodayHeader date="2026-09-20" ready />)
    fireEvent.click(screen.getByRole('button', { name: 'Workout options' }))
    expect(screen.getByRole('button', { name: 'Start blank workout' })).toBeTruthy()
    expect(navigate).not.toHaveBeenCalled()
    view.rerender(<TodayHeader date="2026-09-20" ready activeSessionId="active" />)
    expect(screen.queryByRole('button', { name: 'Start blank workout' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Resume workout' }))
    expect(navigate).toHaveBeenCalledWith({ pathname: '/session/[sessionId]', params: { sessionId: 'active' } })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps numbers, arithmetic access and entry actions in both modes; Advanced adds provenance', () => {
    const view = render(<TodayPlannedSessionCard {...props} />)
    expect(screen.getAllByText('3 sets of 5 · at 80 kg · leave 2 reps')).toHaveLength(5)
    expect(screen.getByText('1 more movement')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'How Bench is worked out' }))
    expect(screen.getByRole('dialog', { name: 'Bench' })).toBeTruthy()
    expect(screen.getAllByText('Calculated: 80 kg')).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    view.rerender(<TodayPlannedSessionCard {...props} mode="full" />)
    expect(screen.getAllByText('3 × 5 · RIR 2')).toHaveLength(4)
    expect(screen.getAllByText('80 kg')).toHaveLength(4)
    expect(screen.getAllByText('Load set by the programme ›')).toHaveLength(4)
    fireEvent.click(screen.getByRole('button', { name: '2 more movements' }))
    expect(screen.getByRole('button', { name: 'How Lunge is worked out' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Start workout' }))
    expect(props.onStart).toHaveBeenCalledTimes(1)
  })

  it('prioritizes review over starting and offers next-workout entry after completion', () => {
    const view = render(<TodayPlannedSessionCard {...props} pendingDecisionCount={2} />)
    expect(screen.queryByRole('button', { name: 'Start workout' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Review progression' }))
    expect(props.onReview).toHaveBeenCalledTimes(1)
    view.rerender(<TodayPlannedSessionCard {...props} completedToday />)
    expect(screen.getByRole('button', { name: 'Start next workout' })).toBeTruthy()
  })

  it('shows saved last-workout facts and opens the existing recap instead of the logger', () => {
    render(<LastWorkoutCard session={{ ...session, sessionId: 'completed-workout', stateVersion: 1, status: 'completed',
      startedAt: '2026-09-22T00:00:00Z', completedAt: '2026-09-22T00:12:40Z', sessionRpe: 7,
      movements: [{ ...session.movements[0], sets: [
        { ...session.movements[0].sets[0], completed: true, actualLoad: 0, actualReps: 6 },
        { ...session.movements[0].sets[1], completed: false },
      ] }] }} />)
    expect(screen.getByText(/1 of 2 sets · 12 min/)).toBeTruthy()
    expect(screen.getByText('You called it hard — 7 out of 10')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /How hard it was/ }))
    expect(screen.getByRole('dialog', { name: 'How hard it was' })).toBeTruthy()
    expect(screen.getByText('Not recorded')).toBeTruthy()
    expect(screen.getByText(/Reps left recorded for 0 of 1/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'View recap' }))
    expect(navigate).toHaveBeenCalledWith({ pathname: '/session/[sessionId]/summary', params: { sessionId: 'completed-workout' } })
  })
})
