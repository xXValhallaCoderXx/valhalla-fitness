import { describe, expect, it } from 'vitest'
import { deleteOwnAccount, exportAccountData } from '@sheetless/data/account/data-rights'
import {
  ACCOUNT_DELETE_CONFIRMATION,
  ACCOUNT_EXPORT_SCHEMA_VERSION,
} from '@sheetless/domain/account/data-rights'
import { makeStubCtx } from './support/supabase-stub'

describe('exportAccountData', () => {
  it('exports and paginates the account equipment-mode choices under the current schema', async () => {
    const choices = Array.from({ length: 1_001 }, (_, index) => ({
      id: `choice-${String(index).padStart(4, '0')}`,
      user_id: 'user-1',
      program_instance_id: 'program-1',
    }))
    const { ctx, stub } = makeStubCtx({
      profiles: [{ id: 'user-1' }],
      bodyweight_entries: [],
      feedback_events: [],
      program_templates: [],
      program_instances: [],
      program_state_values: [],
      program_movement_overrides: [],
      program_accessory_additions: [],
      program_equipment_mode_choices: choices,
      workout_sessions: [],
      exercise_logs: [],
      set_logs: [],
      substitution_logs: [],
      progression_decisions: [],
      session_program_change_journal: [],
    })

    const accountExport = await exportAccountData(ctx)

    expect(accountExport.schemaVersion).toBe('2026-08-24')
    expect(accountExport.schemaVersion).toBe(ACCOUNT_EXPORT_SCHEMA_VERSION)
    expect(accountExport.data.program_equipment_mode_choices).toHaveLength(1_001)
    expect(stub.rangeCalls.filter((call) => call.table === 'program_equipment_mode_choices')).toEqual([
      { table: 'program_equipment_mode_choices', from: 0, to: 999 },
      { table: 'program_equipment_mode_choices', from: 1_000, to: 1_999 },
    ])
    expect(stub.fromCalls).not.toContain('session_mutation_receipts')
  })
})

describe('deleteOwnAccount', () => {
  it('passes the exact validated phrase to the self-delete RPC', async () => {
    const { ctx, stub } = makeStubCtx({})

    await expect(deleteOwnAccount(ctx, {
      confirmation: ACCOUNT_DELETE_CONFIRMATION,
    })).resolves.toEqual({ ok: true })
    expect(stub.rpcCalls).toEqual([{
      fn: 'delete_own_account',
      args: { p_confirmation: ACCOUNT_DELETE_CONFIRMATION },
    }])
  })

  it('rejects a wrong phrase with the friendly error and never calls the RPC', async () => {
    const { ctx, stub } = makeStubCtx({})

    await expect(deleteOwnAccount(ctx, {
      confirmation: 'delete my account',
    } as never)).rejects.toThrow(`Enter ${ACCOUNT_DELETE_CONFIRMATION} exactly`)
    expect(stub.rpcCalls).toHaveLength(0)
  })

  it('rejects a malformed direct call with the friendly error before touching the RPC', async () => {
    const { ctx, stub } = makeStubCtx({})

    await expect(deleteOwnAccount(ctx, null as never)).rejects.toThrow(
      `Enter ${ACCOUNT_DELETE_CONFIRMATION} exactly`,
    )
    expect(stub.rpcCalls).toHaveLength(0)
  })

  it('rejects over-posted input before calling the RPC', async () => {
    const { ctx, stub } = makeStubCtx({})

    await expect(deleteOwnAccount(ctx, {
      confirmation: ACCOUNT_DELETE_CONFIRMATION,
      userId: 'another-user',
    } as never)).rejects.toThrow()
    expect(stub.rpcCalls).toHaveLength(0)
  })
})
