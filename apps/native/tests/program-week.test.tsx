import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { calculateBodyLoad } from '@sheetless/domain/history/body-load'
import { buildProgramOverview } from '@sheetless/domain/program/program-overview'
import { getFallbackTemplateDefinition } from '@sheetless/domain/program/template-definitions'
import { expandPlannedSession } from '@sheetless/domain/program/templates'
import type { ProgramInstance } from '@sheetless/domain/program/types'
import { themeProviderMock } from './support/theme'

const navigation = vi.hoisted(() => ({ push: vi.fn(), navigate: vi.fn() }))
vi.mock('expo-router', () => ({ router: navigation }))
vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('lucide-react-native', () => ({ Check: () => null, ChevronRight: () => null }))
vi.mock('@/components', async () => ({
  ...await import('../src/components/Badge'),
  ...await import('../src/components/Button'),
  ...await import('../src/components/Caption'),
  ...await import('../src/components/Heading'),
  ...await import('../src/components/Panel'),
  ...await import('../src/components/SectionLabel'),
  ...await import('../src/components/SegmentedControl'),
  ...await import('../src/components/Text'),
}))

import { ProgramWeek } from '../src/features/program/overview/ProgramWeek'

const program: ProgramInstance = {
  id: 'program-a', templateId: 'bromley-bullmastiff', templateVersionId: 'version-a',
  title: 'My programme', status: 'active', startDate: '2026-09-01', units: 'kg', rounding: 2.5,
  currentWeekIndex: 1, stateVersion: 0, customizationStatus: 'default',
  customizationSummary: { movementOverrideCount: 0, accessoryAdditionCount: 0 },
  stateValues: [
    { key: 'squat_training_max', movementId: 'squat', type: 'training_max', value: 165 },
    { key: 'bench_press_training_max', movementId: 'bench_press', type: 'training_max', value: 110 },
    { key: 'deadlift_training_max', movementId: 'deadlift', type: 'training_max', value: 190 },
    { key: 'overhead_press_training_max', movementId: 'overhead_press', type: 'training_max', value: 75 },
  ], templateDefinition: getFallbackTemplateDefinition('bromley-bullmastiff'),
}
const planned = expandPlannedSession(program, '2026-09-19', program.templateDefinition)
function overview(state: 'planned' | 'ad_hoc' | 'active' | 'completed') {
  return buildProgramOverview({
    today: {
      activeProgram: program, plannedSession: planned, pendingDecisions: [],
      activeSession: state === 'active' || state === 'ad_hoc'
        ? { ...planned, sessionId: 'active-a', stateVersion: 1, status: 'in_progress', isAdHoc: state === 'ad_hoc' } : null,
      completedSession: state === 'completed' ? { ...planned, sessionId: 'completed-a', stateVersion: 2, status: 'completed' } : null,
    },
    recentSessions: [], bodyLoad: calculateBodyLoad([]), acceptedDecisions: [],
  })
}
beforeEach(() => vi.clearAllMocks())

describe('Plan week workout entry', () => {
  it('keeps the planned preview when an unrelated ad-hoc workout is active', () => {
    render(<ProgramWeek overview={overview('ad_hoc')} />)
    expect(screen.queryByText('Workout in progress')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Preview workout' }))
    expect(navigation.navigate).toHaveBeenCalledWith('/(tabs)')
    expect(navigation.push).not.toHaveBeenCalled()
  })

  it('resumes the actual programme workout', () => {
    render(<ProgramWeek overview={overview('active')} />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume workout' }))
    expect(navigation.push).toHaveBeenCalledWith({ pathname: '/session/[sessionId]', params: { sessionId: 'active-a' } })
  })

  it('opens a completed workout as a recap, keeping it out of the logger', () => {
    render(<ProgramWeek overview={overview('completed')} />)
    fireEvent.click(screen.getByRole('button', { name: 'View recap' }))
    expect(navigation.push).toHaveBeenCalledWith({ pathname: '/session/[sessionId]/summary', params: { sessionId: 'completed-a' } })
  })
})
