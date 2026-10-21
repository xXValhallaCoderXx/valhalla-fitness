import type { ProgramInstance, TemplateDefinition } from '@sheetless/domain/program/types'
import type { ReturnGuideState } from '../../src/features/program/return/useReturnGuideDraft'

export function returnGuideState(): ReturnGuideState {
  const definition: TemplateDefinition = {
    schemaVersion: '2026.06.dsl', id: 'return-test', name: 'Return test', daysPerWeek: 1, durationWeeks: 2,
    requiredState: [{ key: 'anchor', movementId: 'squat', type: 'working_load' }], timelineDescription: '',
    sessions: [{ id: 'day', title: 'Day', estimatedMinutes: 30, slots: [{ id: 'lift', movementId: 'squat', role: 'main', prescriptionId: 'work' }] }],
    weeks: ['base', 'peak'].map(phaseKey => ({ label: phaseKey, phaseKey, phaseLabel: phaseKey, summary: '', hardness: 'Medium',
      prescriptions: { work: { sets: Array.from({ length: 5 }, () => ({ targetLoad: { kind: 'state' as const, stateKey: 'anchor', stateType: 'working_load' as const }, targetReps: 5, targetRir: 2 })), targetSummary: 'Five sets', progressionRuleId: 'simple_linear_completion' } } })),
  }
  const program: ProgramInstance = { id: 'fafa2933-12fc-44ed-8280-cff425ee7e32', templateId: 'return-test', templateVersionId: 'version', title: 'Test',
    status: 'active', startDate: '2026-01-01', units: 'kg', rounding: 2.5, currentWeekIndex: 0, stateVersion: 3,
    customizationStatus: 'default', customizationSummary: { movementOverrideCount: 0, accessoryAdditionCount: 0 },
    stateValues: [{ ...definition.requiredState[0], value: 100 }], templateDefinition: definition }
  return { program, baseline: [], pendingDecisions: [], pendingDecisionIds: [], hasActiveSession: false, lastWorkoutLogged: '2026-09-01' }
}
