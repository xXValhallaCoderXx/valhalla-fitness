import { describe, expect, it, vi } from 'vitest'
import { getProgramSetupSuggestions } from '../src/program/setup-suggestions'
import { getFallbackTemplateDefinition } from '@sheetless/domain/program/template-definitions'
import { makeStubCtx, type TestRow } from './support/supabase-stub'

const templateId = 'healthy-531-fsl'
const definition = getFallbackTemplateDefinition(templateId)
function tables() {
  return {
    profiles: [{ id: 'user-1', units: 'kg', rounding: 2.5, program_state_defaults: { squat_one_rep_max: 100 } },
      { id: 'user-2', units: 'lb', rounding: 5, program_state_defaults: { squat_one_rep_max: 300 } }],
    program_template_versions: [{ id: 'version-1', template_id: templateId, definition, definition_checksum: 'a'.repeat(32), created_at: '2026-09-01' }],
  }
}
function historyRow(id: string, userId = 'user-1', units: 'kg' | 'lb' | null = 'kg'): TestRow {
  return { id, user_id: userId, status: 'completed', scheduled_date: '2026-09-01', completed_at: '2026-09-01T10:00:00Z',
    program_instance_id: null, prescription_snapshot: { units, movements: [] }, is_favorite: false, source_session_id: null }
}
function exercise(id: string, sessionId: string, userId = 'user-1'): TestRow {
  return { id, session_id: sessionId, user_id: userId, planned_movement_id: 'squat', performed_movement_id: 'squat', role: 'main', order_index: 0 }
}
function set(id: string, exerciseId: string, load: number, userId = 'user-1'): TestRow {
  return { id, exercise_log_id: exerciseId, user_id: userId, set_index: 1, completed: true,
    actual_load: load, actual_reps: 1, actual_rir: 0, target_load: load, target_reps: 1, target_rir: 0 }
}

describe('getProgramSetupSuggestions', () => {
  it('reads every history page and account-owned child, omitting unrelated favorites and substitutions', async () => {
    const sessions = Array.from({ length: 501 }, (_, index) => historyRow(String(index).padStart(4, '0')))
    const { ctx, stub } = makeStubCtx({ ...tables(), workout_sessions: [...sessions, historyRow('foreign', 'user-2')],
      exercise_logs: [exercise('old', '0000'), exercise('foreign', 'foreign', 'user-2'), exercise('foreign-child', '0000', 'user-2')],
      set_logs: [set('old', 'old', 120), set('foreign', 'foreign', 600, 'user-2'), set('foreign-child', 'foreign-child', 600, 'user-2')],
    })
    const result = await getProgramSetupSuggestions(ctx, { templateId })
    expect(result.units).toBe('kg')
    expect(result.sourceRows.find(row => row.key === 'squat_training_max')).toMatchObject({ source: 'history', reference: 124, bestSet: { load: 120, date: '2026-09-01' } })
    expect(stub.rangeCalls.filter(row => row.table === 'workout_sessions')).toEqual([
      { table: 'workout_sessions', from: 0, to: 499 }, { table: 'workout_sessions', from: 500, to: 999 },
    ])
    expect(stub.fromCalls).not.toContain('substitution_logs')
    expect(stub.fromCalls.filter(table => table === 'workout_sessions')).toHaveLength(2)
    expect(stub.rpcCalls).toEqual([])
    expect(stub.updateCalls).toEqual([])
  })

  it('returns explicit estimate-only recovery on history failure without failing the setup read', async () => {
    const { ctx, stub } = makeStubCtx(tables())
    const from = stub.from.bind(stub)
    vi.spyOn(stub, 'from').mockImplementation(table => {
      if (table === 'workout_sessions') throw new Error('History offline')
      return from(table)
    })
    const result = await getProgramSetupSuggestions(ctx, { templateId })
    expect(result.historyStatus).toBe('unavailable')
    expect(result.sourceRows.find(row => row.key === 'squat_training_max')).toMatchObject({ source: 'estimate', reference: 100 })
    expect(result.stateValues.find(row => row.key === 'squat_training_max')?.value).toBe(90)
  })

  it('counts legacy workouts with unknown units without treating their loads as current-profile values', async () => {
    const { ctx } = makeStubCtx({ ...tables(), workout_sessions: [historyRow('legacy', 'user-1', null)],
      exercise_logs: [exercise('legacy', 'legacy')], set_logs: [set('legacy', 'legacy', 500)] })
    const result = await getProgramSetupSuggestions(ctx, { templateId })
    expect(result.unknownUnitSessions).toBe(1)
    expect(result.historyStatus).toBe('ready')
    expect(result.sourceRows.find(row => row.key === 'squat_training_max')?.source).toBe('estimate')
  })

  it('does not silently recover missing profile or malformed template definition', async () => {
    const noProfile = makeStubCtx({ ...tables(), profiles: [] })
    await expect(getProgramSetupSuggestions(noProfile.ctx, { templateId })).rejects.toThrow()
    const brokenTemplate = makeStubCtx({ ...tables(), program_template_versions: [{ id: 'bad', template_id: templateId, definition: {} }] })
    await expect(getProgramSetupSuggestions(brokenTemplate.ctx, { templateId })).rejects.toThrow('PINNED_TEMPLATE_INVALID')
  })
})
