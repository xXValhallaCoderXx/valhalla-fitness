import { describe, expect, it } from 'vitest'
import { shouldConfirmProgramStart } from '../src/lib/program-switch'
import type { ProgramInstance, TodayPayload, WorkoutSession } from '../src/types/training'

const activeProgram: ProgramInstance = {
  id: 'program-1',
  templateId: 'healthy-531-fsl',
  templateVersionId: 'template-version-1',
  title: 'Healthy 5/3/1 FSL',
  status: 'active',
  startDate: '2026-06-21',
  units: 'kg',
  rounding: 2.5,
  currentWeekIndex: 0,
  customizationStatus: 'default',
  customizationSummary: { movementOverrideCount: 0, accessoryAdditionCount: 0 },
  stateValues: [],
}

const session = (status: WorkoutSession['status']): WorkoutSession => ({
  sessionId: `session-${status}`,
  id: 'planned-1',
  title: 'Squat',
  programTitle: 'Healthy 5/3/1 FSL',
  templateId: 'healthy-531-fsl',
  weekIndex: 0,
  weekLabel: 'Week 1',
  hardness: 'Medium',
  scheduledDate: '2026-06-21',
  estimatedMinutes: 75,
  units: 'kg',
  rounding: 2.5,
  status,
  movements: [],
})

const today = ({
  activeProgram = null,
  activeSession = null,
}: {
  activeProgram?: ProgramInstance | null
  activeSession?: WorkoutSession | null
}): TodayPayload => ({
  activeProgram,
  plannedSession: null,
  activeSession,
  completedSession: null,
  pendingDecisions: [],
})

describe('program switch guard', () => {
  it('requires confirmation when a programme is active', () => {
    expect(shouldConfirmProgramStart(today({ activeProgram }))).toBe(true)
  })

  it('requires confirmation for an active programme even without an active workout', () => {
    expect(shouldConfirmProgramStart(today({ activeProgram, activeSession: null }))).toBe(true)
  })

  it('does not require confirmation without an active programme', () => {
    expect(shouldConfirmProgramStart(today({ activeSession: null }))).toBe(false)
    expect(shouldConfirmProgramStart(null)).toBe(false)
    expect(shouldConfirmProgramStart(undefined)).toBe(false)
  })

  it('does not use workout session status as the confirmation trigger', () => {
    expect(shouldConfirmProgramStart(today({ activeSession: session('in_progress') }))).toBe(false)
    expect(shouldConfirmProgramStart(today({ activeSession: session('skipped') }))).toBe(false)
    expect(shouldConfirmProgramStart(today({ activeSession: session('completed') }))).toBe(false)
  })
})
