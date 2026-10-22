import { fireEvent, render, screen, within } from '@testing-library/react'
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
import { TodayNoPlan } from '../src/features/session/today/TodayNoPlan'

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
const mixedSession: PlannedSession = { ...session, movements: [
  { ...session.movements[0], sets: [
    { ...session.movements[0].sets[0], targetLoad: 60, targetReps: 5 },
    { ...session.movements[0].sets[1], targetLoad: 80, targetReps: 3, isTopSet: true },
    { ...session.movements[0].sets[2], targetLoad: 70, targetReps: 8, isBackoff: true },
  ] },
  { ...session.movements[1], role: 'accessory', movementName: 'Pull-Up',
    sets: [{ ...session.movements[1].sets[0], targetLoad: 0, targetReps: 10, sourcePrescription: undefined }] },
  { ...session.movements[2], role: 'accessory', movementName: 'Unspecified row',
    sets: [{ ...session.movements[2].sets[0], targetLoad: null, targetReps: null, targetRir: null, sourcePrescription: undefined }] },
  { ...session.movements[5], role: 'accessory', sets: session.movements[5].sets.slice(0, 2).map(set => ({ ...set,
    targetLoad: 22.5, targetReps: null, targetRepMin: 8, targetRepMax: 12,
    sourcePrescription: { targetLoad: { kind: 'fixed' as const, kg: 22.5 } },
  })) },
] }

describe('native Today contract', () => {
  it('opens optional starting estimates at their Settings section without blocking blank entry', () => {
    navigate.mockClear()
    render(<TodayNoPlan hasHistory={false} />)
    expect(screen.getByText('Save optional estimates for future plan setup. Recorded lifts take priority.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Start blank workout' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Add starting numbers' }))
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ pathname: '/settings', params: { section: 'starting-numbers' } })
  })

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
    expect(screen.getByText('3 sets of 5 · at 80 kg · leave 2 reps')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'See all sets and targets' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'How Bench is worked out' }))
    expect(screen.getByRole('dialog', { name: 'Bench' })).toBeTruthy()
    expect(screen.getAllByText('Calculated: 80 kg')).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    view.rerender(<TodayPlannedSessionCard {...props} mode="full" />)
    expect(screen.getAllByText('3 × 5 · RIR 2')).toHaveLength(6)
    expect(screen.getAllByText('80')).toHaveLength(6)
    expect(screen.getAllByText('Load set by the programme ›')).toHaveLength(6)
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

  it('expands every mixed-role movement and inspects the final accessory without starting a workout', () => {
    const onStart = vi.fn()
    render(<TodayPlannedSessionCard {...props} session={mixedSession} onStart={onStart} />)
    const expand = screen.getByRole('button', { name: 'See all sets and targets' })
    expect(screen.queryByText('2 sets of 8–12 · at 22.5 kg · leave 2 reps')).toBeNull()
    fireEvent.click(expand)
    expect(screen.getByRole('button', { name: 'Hide full workout' })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /^How .+ is worked out$/ })).toHaveLength(8)
    expect(screen.getByText('2 sets of 8–12 · at 22.5 kg · leave 2 reps')).toBeTruthy()
    expect(screen.getByText('1 set of 10 · bodyweight · leave 2 reps')).toBeTruthy()
    expect(screen.getByText('1 set of reps of your choice · you choose the load')).toBeTruthy()
    expect(screen.getAllByText('2 sets · working up to 80 kg · leave 2 reps · back-off 1 set of 8 at 70 kg')).toHaveLength(2)
    fireEvent.click(screen.getAllByRole('button', { name: 'How Lunge is worked out' }).at(-1)!)
    const sheet = screen.getByRole('dialog', { name: 'Lunge' })
    expect(within(sheet).getByText('Set 1')).toBeTruthy()
    expect(within(sheet).getByText('Set 2')).toBeTruthy()
    expect(within(sheet).getAllByText('22.5 kg × 8-12')).toHaveLength(2)
    expect(within(sheet).getAllByText('Calculated: 22.5 kg')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.click(screen.getByRole('button', { name: 'Hide full workout' }))
    expect(screen.queryByText('2 sets of 8–12 · at 22.5 kg · leave 2 reps')).toBeNull()
    expect(screen.getAllByRole('button', { name: /^How .+ is worked out$/ })).toHaveLength(4)
    expect(onStart).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Start workout' }))
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('shows eligible previous-set context for ordinary Advanced accessories and suppresses missing or cut-off context', () => {
    const accessory = { ...mixedSession.movements[3], previous: {
      movementId: mixedSession.movements[3].movementId, label: 'Previous Lunge', load: 20, reps: 11, rir: 3,
    } }
    const advancedSession = { ...mixedSession, movements: [accessory] }
    const view = render(<TodayPlannedSessionCard {...props} session={advancedSession} mode="full" />)
    expect(screen.getByText('2 × 8–12 · RIR 2 · last time 20 kg × 11 at RIR 3')).toBeTruthy()
    view.rerender(<TodayPlannedSessionCard {...props} session={{ ...advancedSession,
      movements: [{ ...accessory, previous: null }] }} mode="full" />)
    expect(screen.queryByText(/last time/)).toBeNull()
    view.rerender(<TodayPlannedSessionCard {...props} session={{ ...advancedSession,
      movements: [{ ...accessory, loadSuggestionCutoff: '2026-09-21' }] }} mode="full" />)
    expect(screen.queryByText(/last time/)).toBeNull()
    expect(screen.getByRole('button', { name: 'How Lunge is worked out' })).toBeTruthy()
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
    fireEvent.click(screen.getByRole('button', { name: 'Recap ›' }))
    expect(navigate).toHaveBeenCalledWith({ pathname: '/session/[sessionId]/summary', params: { sessionId: 'completed-workout' } })
  })
})
