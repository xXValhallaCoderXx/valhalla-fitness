import { describe, expect, it, vi } from 'vitest'
import type { ReviewedProgramStartIntent } from '@sheetless/domain/program/reviewed-start'
import { expandSessionFromTemplateDefinition } from '@sheetless/domain/program/template-engine'
import { reviewProgramStart, startReviewedProgram } from '../src/program/reviewed-start'
import { getActiveProgram } from '../src/program/active-program'
import { makeStubCtx } from './support/supabase-stub'

const versionId = '00000000-0000-4000-8000-000000000101'
const programId = '00000000-0000-4000-8000-000000000102'
const sessionId = '00000000-0000-4000-8000-000000000103'
const decisionId = '00000000-0000-4000-8000-000000000104'
const checksum = 'a'.repeat(32)
const definition = {
  schemaVersion: '2026.06.dsl', id: 'review-fixture', name: 'Reviewed plan', durationWeeks: 1, daysPerWeek: 1,
  requiredState: [{ key: 'bench', movementId: 'bench_press', type: 'working_load' }], timelineDescription: 'One session',
  sessions: [{ id: 'day-a', title: 'Day A', estimatedMinutes: 45, slots: [{ id: 'bench', role: 'main', movementId: 'bench_press', prescriptionId: 'work' }] }],
  weeks: [{ label: 'Week 1', phaseKey: 'base', phaseLabel: 'Base', hardness: 'Medium', summary: 'Train',
    prescriptions: { work: { targetSummary: '5 reps', sets: [{ targetReps: 5 }] } } }],
}
const draft = { templateId: definition.id, units: 'lb' as const, rounding: 5, timeZone: 'UTC',
  stateValues: [{ key: 'bench', movementId: 'bench_press', type: 'working_load' as const, value: 135, unit: 'lb' as const }] }
const state = { activeProgram: { id: programId, title: 'Previous', stateVersion: 3 }, activeSessionId: null, pendingDecisionIds: [] }

function fixture() {
  const result = makeStubCtx({
    profiles: [{ id: 'user-1', units: 'kg', rounding: 2.5, timezone: 'UTC', program_state_defaults: {} }],
    program_templates: [{ id: definition.id, name: definition.name, is_active: true, source: 'linear_strength', origin: 'system_default',
      description: '', days_per_week: 1, progression_label: 'Linear', complexity: 'beginner', tags: [] }],
    program_template_versions: [{ id: versionId, template_id: definition.id, definition, definition_checksum: checksum }],
    equipment_mode_policy_versions: [{ id: '00000000-0000-4000-8000-000000000105', mode: 'free_weight', version: '1',
      definition: { rules: [{ id: 'pull-rule', sourceMovementId: 'lat_pulldown', replacementMovementIds: ['pull_up'], loadHandling: 'clear' }] }, definition_checksum: checksum }],
  })
  result.stub.rpcResults.set('get_program_start_review_v1', state)
  return result
}

function previewFixture() {
  const result = fixture()
  result.stub.tables.program_template_versions[0].definition = {
    ...definition, durationWeeks: 2,
    requiredState: [{ key: 'bench_press_working_load', movementId: 'bench_press', type: 'working_load' }],
    sessions: [{ ...definition.sessions[0], slots: [
      ...definition.sessions[0].slots,
      { id: 'row', role: 'accessory', anchorMovementId: 'bench_press', prescriptionId: 'row',
        movementId: { default: 'barbell_row', byPhase: { base: 'dumbbell_row' } } },
      { id: 'pull', role: 'accessory', movementId: 'lat_pulldown', prescriptionId: 'pull' },
    ] }],
    weeks: ['base', 'peak'].map((phaseKey, index) => ({
      ...definition.weeks[0], label: `Week ${index + 1}`, phaseKey,
      prescriptions: {
        work: { targetSummary: 'Ramp then backoff', sets: [
          { targetReps: 5, targetLoad: { kind: 'percent_of_state', stateType: 'working_load', percent: 0.7, percentMax: 0.8, default: 'high' } },
          { targetReps: 8, targetLoad: { kind: 'fixed', kg: 20, lb: 45 } },
        ] },
        row: { targetSummary: '10 reps at half anchor', sets: [
          { targetReps: 10, targetLoad: { kind: 'percent_of_state', stateType: 'working_load', percent: 0.5, default: 'low' } },
        ] },
        pull: { targetSummary: '12 reps', sets: [{ targetReps: 12, targetLoad: { kind: 'fixed', kg: 20, lb: 45 } }] },
      },
    })),
  }
  return result
}

const previewDraft = {
  ...draft, stateValues: [{ ...draft.stateValues[0], key: 'bench_press_working_load' }],
  accessoryAdditions: [
    { sessionId: 'day-a', sourceSlotId: 'row', movementId: 'barbell_row' },
    { sessionId: 'day-a', sourceSlotId: 'pull', movementId: 'lat_pulldown' },
  ],
}

/** Re-read the row shape written by v3, including DB defaults omitted from the frozen intent. */
async function compilePersistedIntent({ ctx, stub }: ReturnType<typeof fixture>, intent: ReviewedProgramStartIntent) {
  const owned = { user_id: ctx.user.id, program_instance_id: programId }
  stub.tables.program_instances = [{
    id: programId, user_id: ctx.user.id, template_id: intent.templateId, template_version_id: intent.templateVersionId,
    title: intent.title, status: 'active', start_date: intent.startDate, units: intent.units, rounding: intent.rounding,
    current_week_index: 0, state_version: 0, equipment_mode: intent.equipmentMode,
    free_weight_policy_version_id: intent.freeWeightPolicyVersionId, customization_status: 'customized',
  }]
  stub.tables.program_state_values = intent.stateValues.map(value => ({ ...owned, key: value.key,
    movement_id: value.movementId, state_type: value.type, value: value.value, unit: value.unit }))
  stub.tables.program_accessory_additions = intent.accessoryAdditions.map(addition => ({ ...owned,
    session_id: addition.sessionId, slot_id: addition.slotId, phase_key: addition.phaseKey,
    movement_id: addition.movementId, prescription_id: addition.prescriptionId, source_slot_id: addition.sourceSlotId,
    effective_from_week_index: addition.effectiveFromWeekIndex, order_index: addition.orderIndex,
    sets: [], target_summary: null, note: null, progression_method: 'history_only',
  }))
  stub.tables.program_equipment_mode_choices = intent.freeWeightChoices.map(choice => ({ ...owned,
    template_session_id: choice.templateSessionId, slot_id: choice.slotId, phase_key: choice.phaseKey,
    role: choice.role, source_movement_id: choice.sourceMovementId,
    replacement_movement_id: choice.replacementMovementId, policy_rule_id: choice.policyRuleId,
  }))
  const saved = await getActiveProgram(ctx)
  if (!saved?.templateDefinition) throw new Error('Expected persisted programme definition')
  return expandSessionFromTemplateDefinition(saved, saved.templateDefinition, intent.startDate)
}

const frozenIntent: ReviewedProgramStartIntent = {
  version: 1, templateId: definition.id, templateVersionId: versionId, definitionChecksum: checksum,
  title: definition.name, startDate: '2026-09-27', units: 'lb', rounding: 5, currentBlockId: 'base',
  stateValues: draft.stateValues, movementOverrides: [], accessoryAdditions: [], equipmentMode: 'standard',
  freeWeightPolicyVersionId: null, freeWeightPolicyChecksum: null, freeWeightChoices: [],
  expectedActiveProgram: { id: programId, stateVersion: 3 },
}
const receipt = { requestId: 'reviewed-1', programId, templateId: definition.id,
  templateVersionId: versionId, startedAt: '2026-09-27T14:00:00+00:00' }

describe('reviewed programme start', () => {
  it('previews the persisted first workout with phase movements, rounded set loads and copied accessory anchors', async () => {
    const setup = previewFixture()
    const review = await reviewProgramStart(setup.ctx, previewDraft)
    expect(review.firstWorkout).toEqual(await compilePersistedIntent(setup, review.intent))
    expect(review.firstWorkout).toMatchObject({ scheduledDate: review.intent.startDate, weekIndex: 0, units: 'lb', rounding: 5 })
    expect(review.firstWorkout.movements.map(movement => ({
      movement: movement.movementId, loads: movement.sets.map(set => set.targetLoad),
    }))).toEqual([
      { movement: 'bench_press', loads: [110, 45] },
      { movement: 'dumbbell_row', loads: [70] },
      { movement: 'lat_pulldown', loads: [45] },
      { movement: 'barbell_row', loads: [70] },
      { movement: 'lat_pulldown', loads: [45] },
    ])
  })

  it('previews persisted free-weight names and clears inherited loads for base and added accessories', async () => {
    const setup = previewFixture()
    const review = await reviewProgramStart(setup.ctx, {
      ...previewDraft, equipmentMode: 'free_weight',
      freeWeightPolicyVersionId: '00000000-0000-4000-8000-000000000105', freeWeightPolicyChecksum: checksum,
      freeWeightChoices: ['base', 'peak'].flatMap(phaseKey => ['slot-day-a-pull', 'slot-day-a-added-accessory-2-lat_pulldown'].map(slotId => ({
        templateSessionId: 'day-a', slotId, phaseKey, role: 'accessory' as const,
        sourceMovementId: 'lat_pulldown', replacementMovementId: 'pull_up', policyRuleId: 'pull-rule',
      }))),
    })
    expect(review.firstWorkout).toEqual(await compilePersistedIntent(setup, review.intent))
    for (const index of [2, 4]) {
      expect(review.firstWorkout.movements[index]).toMatchObject({
        movementId: 'pull_up', movementName: 'Pull-Up', modeAdaptation: { loadReset: true },
        sets: [{ targetLoad: null, actualLoad: null, targetReps: 12 }],
      })
    }
    expect(review.firstWorkout.movements[0].sets.map(set => set.targetLoad)).toEqual([110, 45])
    expect(setup.stub.insertCalls).toHaveLength(0)
    expect(setup.stub.updateCalls).toHaveLength(0)
  })

  it('reviews validated programme values and an authoritative account snapshot without writing anything', async () => {
    const { ctx, stub } = fixture()
    const review = await reviewProgramStart(ctx, draft)
    expect(review).toMatchObject({ ...state, canStart: true, intent: { ...frozenIntent, startDate: expect.any(String) } })
    expect(stub.rpcCalls).toEqual([{ fn: 'get_program_start_review_v1', args: { p_expected_user_id: 'user-1' } }])
    expect(stub.insertCalls).toHaveLength(0)
    expect(stub.updateCalls).toHaveLength(0)
    expect(stub.tables.profiles[0]).toMatchObject({ units: 'kg', rounding: 2.5 })
  })

  it.each([
    { ...state, activeSessionId: sessionId },
    { ...state, pendingDecisionIds: [decisionId] },
    { ...state, activeSessionId: sessionId, pendingDecisionIds: [decisionId] },
  ])('returns resolve-first blockers without replacing or resolving current training', async (blockingState) => {
    const { ctx, stub } = fixture()
    stub.rpcResults.set('get_program_start_review_v1', blockingState)
    expect(await reviewProgramStart(ctx, draft)).toMatchObject({ ...blockingState, canStart: false })
    expect(stub.updateCalls).toHaveLength(0)
  })

  it('freezes an explicit no-active-plan expectation for first setup', async () => {
    const { ctx, stub } = fixture()
    stub.rpcResults.set('get_program_start_review_v1', { ...state, activeProgram: null })
    expect(await reviewProgramStart(ctx, draft)).toMatchObject({ canStart: true, intent: { expectedActiveProgram: null } })
  })

  it('fails closed when review state cannot be read, and does not synthesize a profile', async () => {
    const { ctx, stub } = fixture()
    stub.rpcResults.set('get_program_start_review_v1', null)
    await expect(reviewProgramStart(ctx, draft)).rejects.toThrow()
    stub.tables.profiles = []
    await expect(reviewProgramStart(ctx, draft)).rejects.toThrow()
    expect(stub.insertCalls).toHaveLength(0)
  })

  it('rejects invalid requirements and mismatched state units rather than relabeling weights', async () => {
    const { ctx } = fixture()
    await expect(reviewProgramStart(ctx, { ...draft, stateValues: [] })).rejects.toThrow('Missing valid programme state')
    await expect(reviewProgramStart(ctx, { ...draft, stateValues: [{ ...draft.stateValues[0], unit: 'kg' }] })).rejects.toThrow('programme units')
    await expect(reviewProgramStart(ctx, { ...draft, stateValues: [{ ...draft.stateValues[0], movementId: 'squat' }] })).rejects.toThrow('PROGRAM_START_STATE_INVALID')
  })

  it('replays the frozen payload directly without reading catalogue, profile, policy, or active programme', async () => {
    const { ctx, stub } = makeStubCtx({})
    const from = vi.spyOn(stub, 'from')
    stub.rpcResults.set('start_program_v4', receipt)
    const input = { requestId: receipt.requestId, intent: frozenIntent }
    expect(await startReviewedProgram(ctx, input)).toEqual(receipt)
    expect(await startReviewedProgram(ctx, input)).toEqual(receipt)
    expect(from).not.toHaveBeenCalled()
    expect(stub.rpcCalls).toEqual([0, 1].map(() => ({ fn: 'start_program_v4', args: {
      p_request_id: input.requestId, p_intent: frozenIntent, p_expected_user_id: ctx.user.id,
    } })))
  })

  it.each([null, {}, { ...receipt, requestId: 'wrong' }, { ...receipt, templateId: 'wrong' },
    { ...receipt, templateVersionId: programId }, { ...receipt, startedAt: 'not-a-date' },
  ])('rejects a missing or mismatched receipt (%j)', async (response) => {
    const { ctx, stub } = makeStubCtx({})
    stub.rpcResults.set('start_program_v4', response)
    await expect(startReviewedProgram(ctx, { requestId: receipt.requestId, intent: frozenIntent })).rejects.toThrow()
  })

  it('propagates absent-schema and conflict failures without fallback to destructive legacy start', async () => {
    const { ctx, stub } = makeStubCtx({})
    const rpc = vi.spyOn(stub, 'rpc').mockResolvedValue({ data: null, error: { message: 'Could not find start_program_v4' } } as never)
    await expect(startReviewedProgram(ctx, { requestId: receipt.requestId, intent: frozenIntent })).rejects.toThrow('Could not find start_program_v4')
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc.mock.calls[0][0]).toBe('start_program_v4')
  })

  it('pins a first start to the captured account when auth changes before submission', async () => {
    const { ctx, stub } = makeStubCtx({}, 'captured-account')
    const auth = vi.spyOn(stub.auth, 'getUser')
    const rpc = vi.spyOn(stub, 'rpc').mockResolvedValue({ data: null, error: { message: 'PROGRAM_START_ACCOUNT_CHANGED' } } as never)
    const intent = { ...frozenIntent, expectedActiveProgram: null }
    await expect(startReviewedProgram(ctx, { requestId: receipt.requestId, intent })).rejects.toThrow('PROGRAM_START_ACCOUNT_CHANGED')
    expect(auth).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledExactlyOnceWith('start_program_v4', {
      p_request_id: receipt.requestId, p_intent: intent, p_expected_user_id: 'captured-account',
    })
  })
})
