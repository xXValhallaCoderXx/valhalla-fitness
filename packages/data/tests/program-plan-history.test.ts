import { describe, expect, it, vi } from 'vitest'
import { getProgramOverview } from '@sheetless/data/history/history'
import { getToday } from '@sheetless/data/session/reads'
import { getFallbackTemplateDefinition } from '@sheetless/domain/program/template-definitions'
import type { ProgramInstance } from '@sheetless/domain/program/types'
import { makeStubCtx } from './support/supabase-stub'

vi.mock('@sheetless/data/session/reads', () => ({ getToday: vi.fn() }))

describe('Plan saved facts from existing history', () => {
  it('retains historical target loads, units, identity and bodyweight completion in overview stamps', async () => {
    const program: ProgramInstance = {
      id: 'program-1', templateId: 'bromley-bullmastiff', templateVersionId: 'version-1', title: 'My plan',
      status: 'active', startDate: '2026-09-01', units: 'kg', rounding: 2.5, currentWeekIndex: 1, stateVersion: 1,
      customizationStatus: 'default', customizationSummary: { movementOverrideCount: 0, accessoryAdditionCount: 0 },
      templateDefinition: getFallbackTemplateDefinition('bromley-bullmastiff'),
      stateValues: ['squat', 'bench_press', 'deadlift', 'overhead_press'].map((movementId) => ({
        movementId, key: `${movementId}_training_max`, type: 'training_max', value: 100,
      })),
    }
    vi.mocked(getToday).mockResolvedValue({
      activeProgram: program, activeSession: null, completedSession: null, plannedSession: null, pendingDecisions: [],
    })
    const { ctx, stub } = makeStubCtx({
      profiles: [{ id: 'user-1', timezone: 'UTC', sex: null, units: 'kg' }],
      workout_sessions: [{
        id: 'saved-workout', user_id: 'user-1', program_instance_id: 'program-1', planned_session_id: 'squat-w1',
        status: 'completed', completed_at: '2026-09-20T12:00:00Z', scheduled_date: '2026-09-20',
        prescription_snapshot: {
          title: 'Saved squat', units: 'lb', weekIndex: 0,
          movements: [{ sets: [{}, {}] }, { sets: [{}] }],
        },
      }],
      exercise_logs: [{
        id: 'main', user_id: 'user-1', session_id: 'saved-workout', role: 'main', order_index: 1,
        planned_movement_id: 'squat', performed_movement_id: 'front_squat',
      }, {
        id: 'accessory', user_id: 'user-1', session_id: 'saved-workout', role: 'accessory', order_index: 2,
        planned_movement_id: 'pull_up', performed_movement_id: 'pull_up',
      }],
      set_logs: [
        { id: 'main-1', exercise_log_id: 'main', user_id: 'user-1', set_index: 1, target_load: '93.5', actual_load: '250', actual_reps: 5, completed: true },
        { id: 'main-2', exercise_log_id: 'main', user_id: 'user-1', set_index: 2, target_load: '95', actual_load: null, actual_reps: null, completed: false },
        { id: 'accessory-1', exercise_log_id: 'accessory', user_id: 'user-1', set_index: 1, target_load: null, actual_load: 0, actual_reps: 10, completed: true },
      ],
    })

    const overview = await getProgramOverview(ctx)

    expect(overview.sessionStamps).toEqual([{
      weekIndex: 0, completedAt: '2026-09-20T12:00:00Z', id: 'saved-workout', title: 'Saved squat',
      units: 'lb', movementCount: 2, plannedSetCount: 3, completedSetCount: 2,
      mainTargets: [{ plannedMovementId: 'squat', performedMovementId: 'front_squat', targetLoad: 95 }],
    }])
    expect(stub.rpcCalls).toEqual([])
  })
})
