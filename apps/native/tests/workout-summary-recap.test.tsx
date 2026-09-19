import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildWorkoutSummary } from '@sheetless/domain/history/workout-summary'
import type { WorkoutSession } from '@sheetless/domain/session/types'
import { themeProviderMock } from './support/theme'

const experience = vi.hoisted(() => ({ mode: 'guided' as 'guided' | 'full' }))
vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('@/lib/experience-mode', () => ({ useExperienceMode: () => ({ mode: experience.mode, isFull: experience.mode === 'full' }) }))
vi.mock('lucide-react-native', () => ({ Trophy: () => null }))
vi.mock('@/components', async () => ({
  ...await import('../src/components/Badge'),
  ...await import('../src/components/Caption'),
  ...await import('../src/components/Heading'),
  ...await import('../src/components/Panel'),
  ...await import('../src/components/SectionLabel'),
  ...await import('../src/components/StatCard'),
  ...await import('../src/components/Text'),
}))

import { WorkoutSummaryRecap } from '../src/features/session/summary/WorkoutSummaryRecap'

const session = {
  units: 'kg', estimatedMinutes: 75,
  movements: [
    { id: 'bench', movementId: 'bench', movementName: 'Bench press', role: 'main', orderIndex: 0,
      targetSummary: '2 × 5 @ RIR 2', sets: [
        { id: 'set-1', setIndex: 1, completed: true, actualLoad: 60, actualReps: 5, actualRir: 2, targetReps: 5, targetRir: 2 },
        { id: 'set-2', setIndex: 2, completed: false, targetLoad: 70, targetReps: 5, targetRir: 2 },
      ] },
    { id: 'row', movementId: 'row', movementName: 'Row', role: 'accessory', orderIndex: 1,
      targetSummary: '1 × 10 @ RIR 3', sets: [
        { id: 'set-3', setIndex: 1, completed: false, targetLoad: 40, targetReps: 10, targetRir: 3 },
      ] },
  ],
} as WorkoutSession

beforeEach(() => { experience.mode = 'guided' })

describe('native completed workout recap', () => {
  it('shows only logged sets and plain Guided prescriptions', () => {
    render(<WorkoutSummaryRecap session={session} recap={buildWorkoutSummary(session)} />)
    expect(screen.getByText('1 set logged · best 60 kg × 5')).toBeTruthy()
    expect(screen.getByText('No sets logged')).toBeTruthy()
    expect(screen.getByText('Planned: 2 × 5')).toBeTruthy()
    expect(screen.getByText('Planned: 1 × 10')).toBeTruthy()
    expect(screen.getByText('1: 60 kg × 5 · ~2 left')).toBeTruthy()
    expect(screen.queryByText(/RIR/)).toBeNull()
    expect(screen.queryByText(/70 kg|40 kg|best —|Hit target/)).toBeNull()
  })

  it('keeps authored prescriptions and actual RIR available in Full mode', () => {
    experience.mode = 'full'
    render(<WorkoutSummaryRecap session={session} recap={buildWorkoutSummary(session)} />)
    expect(screen.getByText('Planned: 2 × 5 @ RIR 2')).toBeTruthy()
    expect(screen.getByText('1: 60 kg × 5 · RIR 2')).toBeTruthy()
    expect(screen.getByText('No sets logged')).toBeTruthy()
  })
})
