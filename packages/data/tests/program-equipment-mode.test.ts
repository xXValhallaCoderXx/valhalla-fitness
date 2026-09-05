import { describe, expect, it } from 'vitest'
import { setProgramEquipmentMode } from '@sheetless/data/program/equipment-mode'
import { getLatestFreeWeightPolicyVersion } from '@sheetless/data/program/template-data'
import { startProgram } from '@sheetless/data/program/start'
import { getProgramSetupOptions } from '@sheetless/data/program/templates'
import { makeStubCtx } from './support/supabase-stub'

const programId = 'f93f3498-4d9c-4ec3-93ef-7520f8971c19'
const templateVersionId = 'ffbe42d8-86d7-4714-88d5-8599fc5183d3'
const policyVersionId = '00000000-0000-4000-8000-000000000201'
const policyChecksum = 'd1a7e4203f2807c1a2ec9efe947d371e'

const policyRule = {
  id: 'free-weight-v1-lat_pulldown',
  sourceMovementId: 'lat_pulldown',
  replacementMovementIds: ['pull_up'],
  loadHandling: 'clear',
}

const choice = {
  templateSessionId: 'pull-day',
  slotId: 'slot-pull-day-primary',
  phaseKey: 'base',
  role: 'variation' as const,
  sourceMovementId: 'lat_pulldown',
  replacementMovementId: 'pull_up',
  policyRuleId: policyRule.id,
}

const definition = {
  schemaVersion: '2026.06.dsl',
  id: 'template-1',
  name: 'Pull programme',
  durationWeeks: 1,
  daysPerWeek: 1,
  requiredState: [],
  timelineDescription: 'Fixture programme',
  sessions: [
    {
      id: 'pull-day',
      title: 'Pull day',
      estimatedMinutes: 45,
      slots: [
        {
          id: 'primary',
          role: 'variation',
          movementId: 'lat_pulldown',
          prescriptionId: 'work',
        },
      ],
    },
  ],
  weeks: [
    {
      label: 'Week 1',
      phaseKey: 'base',
      phaseLabel: 'Base',
      summary: 'Build',
      hardness: 'Medium',
      prescriptions: {
        work: {
          targetSummary: '3 x 8',
          sets: [{ targetReps: 8 }],
        },
      },
    },
  ],
}

function activeFreeWeightTables() {
  return {
    program_instances: [
      {
        id: programId,
        user_id: 'user-1',
        template_id: definition.id,
        template_version_id: templateVersionId,
        title: definition.name,
        status: 'active',
        start_date: '2026-08-24',
        units: 'kg',
        rounding: 2.5,
        current_week_index: 0,
        state_version: 5,
        equipment_mode: 'free_weight',
        free_weight_policy_version_id: policyVersionId,
        free_weight_choices_hash: 'saved-choice-hash',
        customization_status: 'default',
        customization_summary: {
          movementOverrideCount: 0,
          accessoryAdditionCount: 0,
        },
        created_at: '2026-08-24T00:00:00.000Z',
      },
    ],
    program_state_values: [],
    program_movement_overrides: [],
    program_accessory_additions: [],
    program_equipment_mode_choices: [
      {
        id: '805dfe37-3600-48c2-bac4-a8f415460a05',
        user_id: 'user-1',
        program_instance_id: programId,
        template_session_id: choice.templateSessionId,
        slot_id: choice.slotId,
        phase_key: choice.phaseKey,
        role: choice.role,
        source_movement_id: choice.sourceMovementId,
        replacement_movement_id: choice.replacementMovementId,
        policy_rule_id: choice.policyRuleId,
      },
    ],
    program_template_versions: [
      {
        id: templateVersionId,
        template_id: definition.id,
        definition,
        definition_checksum: 'template-checksum',
      },
    ],
    program_templates: [
      {
        id: definition.id,
        name: definition.name,
        description: 'Fixture programme',
        source: 'linear_strength',
        origin: 'system_default',
        days_per_week: 1,
        progression_label: 'Fixture progression',
        complexity: 'beginner',
        tags: [],
        is_active: true,
      },
    ],
    equipment_mode_policy_versions: [
      {
        id: policyVersionId,
        mode: 'free_weight',
        version: '1',
        definition: { rules: [policyRule] },
        definition_checksum: policyChecksum,
        created_at: '2026-08-24T00:00:00.000Z',
      },
    ],
    movements: [],
    movement_replacement_rules: [],
    profiles: [
      {
        id: 'user-1',
        email: 'user-1@test.local',
        units: 'kg',
        rounding: 2.5,
        timezone: 'UTC',
        program_state_defaults: {},
      },
    ],
  }
}

describe('programme data ingress parsing', () => {
  it('uses parsed setup and start values after validation', async () => {
    const { ctx, stub } = makeStubCtx(activeFreeWeightTables())

    const setup = await getProgramSetupOptions(ctx.supabase, {
      templateId: ' template-1 ',
    })
    expect(setup.templateId).toBe('template-1')

    await startProgram(ctx, {
      requestId: ' start-1 ',
      templateId: ' template-1 ',
      timeZone: ' UTC ',
      title: ' Pull starter ',
      equipmentMode: 'standard',
    })

    expect(stub.rpcCalls).toContainEqual({
      fn: 'start_program_v3',
      args: expect.objectContaining({
        p_request_id: 'start-1',
        p_template_id: 'template-1',
        p_title: 'Pull starter',
        p_equipment_mode: 'standard',
      }),
    })
  })
})

describe('active programme equipment mode writes', () => {
  it('forwards an exact lost-response replay to the convergent RPC', async () => {
    const { ctx, stub } = makeStubCtx(activeFreeWeightTables())

    const program = await setProgramEquipmentMode(ctx, {
      programId,
      targetMode: 'free_weight',
      expectedStateVersion: 4,
      freeWeightPolicyVersionId: policyVersionId,
      freeWeightPolicyChecksum: policyChecksum,
      freeWeightChoices: [
        {
          templateSessionId: ` ${choice.templateSessionId} `,
          slotId: ` ${choice.slotId} `,
          phaseKey: ` ${choice.phaseKey} `,
          role: choice.role,
          sourceMovementId: ` ${choice.sourceMovementId} `,
          replacementMovementId: ` ${choice.replacementMovementId} `,
          policyRuleId: ` ${choice.policyRuleId} `,
        },
      ],
    })

    expect(stub.rpcCalls).toEqual([
      {
        fn: 'set_program_equipment_mode_v1',
        args: {
          p_program_id: programId,
          p_target_mode: 'free_weight',
          p_expected_state_version: 4,
          p_free_weight_policy_version_id: policyVersionId,
          p_free_weight_policy_checksum: policyChecksum,
          p_free_weight_choices: [choice],
        },
      },
    ])
    expect(program).toMatchObject({
      id: programId,
      stateVersion: 5,
      equipmentMode: 'free_weight',
    })
  })

  it('still rejects stale choices before invoking the convergence RPC', async () => {
    const { ctx, stub } = makeStubCtx(activeFreeWeightTables())

    await expect(
      setProgramEquipmentMode(ctx, {
        programId,
        targetMode: 'free_weight',
        expectedStateVersion: 4,
        freeWeightPolicyVersionId: policyVersionId,
        freeWeightPolicyChecksum: policyChecksum,
        freeWeightChoices: [
          { ...choice, replacementMovementId: 'chin_up' },
        ],
      }),
    ).rejects.toThrow('FREE_WEIGHT_CHOICE_STALE')

    expect(stub.rpcCalls).toEqual([])
  })
})

describe('stored free-weight policy ingress', () => {
  it('fails closed on a legacy array definition', async () => {
    const { ctx } = makeStubCtx({
      equipment_mode_policy_versions: [
        {
          id: policyVersionId,
          mode: 'free_weight',
          version: '1',
          definition: [policyRule],
          definition_checksum: policyChecksum,
          created_at: '2026-08-24T00:00:00.000Z',
        },
      ],
    })

    await expect(
      getLatestFreeWeightPolicyVersion(ctx.supabase),
    ).rejects.toThrow('FREE_WEIGHT_POLICY_INVALID')
  })
})
