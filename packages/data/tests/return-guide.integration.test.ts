import { execFileSync } from 'node:child_process'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@sheetless/domain/shared/types/database'
import type { TemplateDefinition } from '@sheetless/domain/program/types'
import { buildReturnPreview } from '@sheetless/domain/program/return-preview'
import { defaultReturnSettings } from '@sheetless/domain/program/return-settings'
import { getReturnGuide, changeProgramReturn, returnChangeInput } from '../src/program/return-guide'
import { getActiveProgram } from '../src/program/active-program'
import { startSession, discardSession } from '../src/session/lifecycle'
import { finishSession } from '../src/session/completion'
import { upsertSetLog } from '../src/session/sets'
import type { UserContext } from '../src/shared/context'

// Explicit local-only opt-in; uses disposable users and never edits demo accounts.
describe.skipIf(process.env.RETURN_DB_TEST !== '1')(
  'return guide local database integration',
  () => {
    let admin: ReturnType<typeof createClient<Database>>
    let apiUrl: string
    let anonKey: string
    const users: string[] = []
    beforeAll(() => {
      const local = JSON.parse(
        execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
          cwd: '../..',
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }),
      )
      apiUrl = local.API_URL
      if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(apiUrl))
        throw new Error('Local Supabase required')
      anonKey = local.ANON_KEY
      admin = createClient<Database>(apiUrl, local.SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(10000) }),
        },
      })
    })
    afterAll(async () => {
      for (const id of users) {
        const { error } = await admin.auth.admin.deleteUser(id)
        if (error) throw error
      }
    })
    async function fixture(
      templateId?: string,
      customDefinition?: TemplateDefinition,
      units: 'kg' | 'lb' = 'kg',
    ) {
      const email = `return-test-${crypto.randomUUID()}@example.test`
      const password = crypto.randomUUID() + 'aA1!'
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (error || !data.user) throw error ?? new Error('Missing user')
      users.push(data.user.id)
      const profile = await admin.from('profiles').insert({ id: data.user.id, email })
      if (profile.error) throw profile.error
      const supabase = createClient<Database>(apiUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(10000) }),
        },
      })
      const signIn = await supabase.auth.signInWithPassword({ email, password })
      if (signIn.error) throw signIn.error
      const ctx: UserContext = { supabase, user: data.user }
      if (customDefinition) {
        templateId = `custom-${ctx.user.id.slice(0, 8)}-return`
        customDefinition = { ...customDefinition, id: templateId }
        const made = await ctx.supabase.rpc('create_custom_program_template_v2', {
          p_template: {
            id: templateId,
            name: customDefinition.name,
            description: 'Local test',
            daysPerWeek: 1,
            progressionLabel: 'Manual',
            complexity: 'Beginner',
            schemaVersion: '2026.06.dsl',
            tags: ['custom'],
          },
          p_definition:
            customDefinition as unknown as import('@sheetless/domain/shared/types/database').Json,
        })
        if (made.error) throw made.error
      }
      const versions = await admin
        .from('program_template_versions')
        .select('*')
        .eq('template_id', templateId ?? 'generic_alternating_5x5_lp')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (versions.error) throw versions.error
      const definition = versions.data.definition as unknown as TemplateDefinition
      const inserted = await admin
        .from('program_instances')
        .insert({
          user_id: data.user.id,
          template_id: definition.id,
          template_version_id: versions.data.id,
          title: 'Return integration',
          status: 'active',
          start_date: '2026-09-06',
          units,
          rounding: units === 'kg' ? 2.5 : 5,
          current_week_index: 0,
        })
        .select('id')
        .single()
      if (inserted.error) throw inserted.error
      const states = await admin.from('program_state_values').insert(
        definition.requiredState.map((state) => ({
          user_id: data.user.id,
          program_instance_id: inserted.data.id,
          key: state.key,
          movement_id: state.movementId,
          state_type: state.type,
          value: 100,
          unit: units,
        })),
      )
      if (states.error) throw states.error
      return { ctx, programId: inserted.data.id, definition }
    }
    it('exercises resets, retries, adjusted start, finish and review across populated programme families', async () => {
      const localPrograms = await admin
        .from('program_instances')
        .select('template_id')
        .eq('status', 'active')
      if (localPrograms.error) throw localPrograms.error
      const templateIds = [
        ...new Set(localPrograms.data.map((program) => program.template_id)),
      ].slice(0, 3)
      expect(templateIds.length).toBeGreaterThan(0)
      for (const templateId of templateIds) {
        const { ctx, definition } = await fixture(templateId)
        const state = await getReturnGuide(ctx)
        const settings = defaultReturnSettings(definition.daysPerWeek, 2.5)
        settings.stages = [{ workouts: 1, setFraction: 0.5, setCounts: {} }]
        const preview = buildReturnPreview(state.program, { settings, scheduledDate: '2026-09-06' })
        const intent = returnChangeInput(
          state,
          settings,
          preview.changes,
          'apply',
          crypto.randomUUID(),
        )
        await changeProgramReturn(ctx, intent)
        await changeProgramReturn(ctx, intent)
        const reset = await getActiveProgram(ctx)
        expect(reset!.stateValues[0].value).toBe(80)
        await expect(
          changeProgramReturn(ctx, { ...intent, requestId: crypto.randomUUID() }),
        ).rejects.toThrow(/CONFLICT/)
        const legacyStart = await ctx.supabase.rpc('start_session_v2', {
          p_client_mutation_id: crypto.randomUUID(),
          p_program_instance_id: reset!.id,
          p_planned_session_id: 'x',
          p_scheduled_date: '2026-09-06',
          p_prescription_snapshot: {},
          p_expected_program_version: reset!.stateVersion,
          p_source_session_id: null,
        })
        expect(legacyStart.error?.message).toContain('RETURN_CLIENT_UPDATE_REQUIRED')
        const session = await startSession(ctx, {
          clientMutationId: crypto.randomUUID(),
          timeZone: 'UTC',
        })
        expect(session.returnContext?.periodId).toBe(reset!.returnPeriod!.id)
        await expect(
          changeProgramReturn(ctx, {
            ...intent,
            expectedVersion: reset!.stateVersion,
            requestId: crypto.randomUUID(),
            action: 'update',
          }),
        ).rejects.toThrow(/current workout/)
        const movement = session.movements[0]
        const set = movement.sets[0]
        const logged = await upsertSetLog(ctx, {
          sessionId: session.sessionId,
          exerciseLogId: movement.id,
          setIndex: set.setIndex,
          actualLoad: set.targetLoad ?? 20,
          actualReps: set.targetReps ?? set.targetRepMin ?? 8,
          actualRir: 3,
          completed: true,
          clientMutationId: crypto.randomUUID(),
          expectedStateVersion: session.stateVersion,
        })
        const finishIntent = { sessionId: session.sessionId, requestId: crypto.randomUUID() }
        await finishSession(ctx, finishIntent)
        await finishSession(ctx, finishIntent)
        const reviewed = await getActiveProgram(ctx)
        expect(reviewed!.currentWeekIndex).toBe(1)
        expect(reviewed!.returnPeriod!.completedWorkouts).toBe(1)
        expect(reviewed!.returnPeriod!.status).toBe('review')
        expect(logged.stateVersion).toBeGreaterThan(session.stateVersion)
        const endState = await getReturnGuide(ctx)
        await changeProgramReturn(
          ctx,
          returnChangeInput(endState, settings, [], 'end', crypto.randomUUID()),
        )
        expect((await getActiveProgram(ctx))!.stateValues[0].value).toBe(80)
        const ordinary = await startSession(ctx, {
          clientMutationId: crypto.randomUUID(),
          timeZone: 'UTC',
        })
        expect(ordinary.returnContext).toBeUndefined()
        await discardSession(ctx, { sessionId: ordinary.sessionId })
      }
    }, 60000)
    it('keeps the actual pre-guide workout baseline after lighter return workouts', async () => {
      const { ctx } = await fixture()
      const logFirst = async () => {
        const session = await startSession(ctx, {
          clientMutationId: crypto.randomUUID(),
          timeZone: 'UTC',
        })
        const movement = session.movements[0]
        const set = movement.sets[0]
        await upsertSetLog(ctx, {
          sessionId: session.sessionId,
          exerciseLogId: movement.id,
          setIndex: set.setIndex,
          actualLoad: set.targetLoad!,
          actualReps: set.targetReps!,
          actualRir: 3,
          completed: true,
          clientMutationId: crypto.randomUUID(),
          expectedStateVersion: session.stateVersion,
        })
        await finishSession(ctx, { sessionId: session.sessionId, requestId: crypto.randomUUID() })
      }
      await logFirst()
      const before = await getReturnGuide(ctx)
      expect(before.baseline).toHaveLength(1)
      expect(before.baseline[0]).toMatchObject({ load: 100, reps: 5 })
      const preview = buildReturnPreview(before.program, { scheduledDate: '2026-09-06' })
      await changeProgramReturn(
        ctx,
        returnChangeInput(before, preview.settings, preview.changes, 'apply', crypto.randomUUID()),
      )
      await logFirst()
      expect((await getReturnGuide(ctx)).baseline).toEqual(before.baseline)
    }, 60000)
    it('validates retained work and caps increases at finish, then keeps accepted increases through extension/end', async () => {
      const { ctx, programId } = await fixture()
      const state = await getReturnGuide(ctx)
      const settings = defaultReturnSettings(1, 2.5)
      settings.stages = [{ workouts: 1, setFraction: 0.5, setCounts: {} }]
      const preview = buildReturnPreview(state.program, { settings, scheduledDate: '2026-09-06' })
      await changeProgramReturn(
        ctx,
        returnChangeInput(state, settings, preview.changes, 'apply', crypto.randomUUID()),
      )
      let session = await startSession(ctx, {
        clientMutationId: crypto.randomUUID(),
        timeZone: 'UTC',
      })
      for (const movement of session.movements.filter((item) => item.role === 'main')) {
        for (const set of movement.sets) {
          session = await upsertSetLog(ctx, {
            sessionId: session.sessionId,
            exerciseLogId: movement.id,
            setIndex: set.setIndex,
            actualLoad: set.targetLoad!,
            actualReps: set.targetReps ?? set.targetRepMin ?? 5,
            actualRir: 3,
            completed: true,
            clientMutationId: crypto.randomUUID(),
            expectedStateVersion: session.stateVersion,
          })
        }
      }
      const { buildProgressionDecisionsForSession } =
        await import('@sheetless/domain/program/progression-decisions')
      const active = (await getActiveProgram(ctx))!
      const decisions = buildProgressionDecisionsForSession(session, active)
      expect(decisions.length).toBeGreaterThan(0)
      const tampered = await ctx.supabase.rpc('finish_session_v3', {
        p_session_id: session.sessionId,
        p_request_id: crypto.randomUUID(),
        p_notes: null,
        p_session_rpe: null,
        p_reflection_win: null,
        p_reflection_improve: null,
        p_prs: [],
        p_decisions: decisions.map((decision) => ({
          ...decision,
          recommendedValue: decision.previousValue! + 50,
        })),
        p_expected_program_version: active.stateVersion,
        p_expected_session_version: session.stateVersion,
      })
      expect(tampered.error?.message).toContain('RETURN_PROGRESSION_CAP_INVALID')
      const result = await finishSession(ctx, {
        sessionId: session.sessionId,
        requestId: crypto.randomUUID(),
      })
      expect(
        result.decisions.every(
          (decision) => decision.recommendedValue === decision.previousValue! + 2.5,
        ),
      ).toBe(true)
      const resolve = await ctx.supabase.rpc('resolve_progression_decisions_v2', {
        p_decision_ids: result.decisions.map((decision) => decision.id),
        p_action: 'accepted',
        p_request_id: crypto.randomUUID(),
      })
      if (resolve.error) throw resolve.error
      const { getSession } = await import('../src/session/reads')
      const saved = await getSession(ctx, session.sessionId)
      expect(saved.returnRecommendations?.map((decision) => decision.recommendation)).toEqual(
        result.decisions.map((decision) => decision.recommendation),
      )
      const after = await getReturnGuide(ctx)
      const accepted = after.program.stateValues.map((value) => value.value)
      const extendedSettings = {
        ...settings,
        stages: [...settings.stages, { workouts: 1, setFraction: 0.75, setCounts: {} }],
      }
      const extension = buildReturnPreview(after.program, {
        settings: extendedSettings,
        scheduledDate: '2026-09-06',
      })
      await changeProgramReturn(
        ctx,
        returnChangeInput(
          after,
          extendedSettings,
          extension.changes,
          'extend',
          crypto.randomUUID(),
        ),
      )
      const extended = await getReturnGuide(ctx)
      expect(extended.program.stateValues.map((value) => value.value)).toEqual(accepted)
      expect(extended.program.returnPeriod?.completedWorkouts).toBe(1)
      const next = await startSession(ctx, {
        clientMutationId: crypto.randomUUID(),
        timeZone: 'UTC',
      })
      expect(next.returnContext?.stageIndex).toBe(1)
      await discardSession(ctx, { sessionId: next.sessionId })
      const ending = await getReturnGuide(ctx)
      await changeProgramReturn(
        ctx,
        returnChangeInput(ending, extendedSettings, [], 'end', crypto.randomUUID()),
      )
      expect((await getActiveProgram(ctx))!.stateValues.map((value) => value.value)).toEqual(
        accepted,
      )
      const outsider = await fixture()
      const leaked = await outsider.ctx.supabase
        .from('program_load_adjustments')
        .select('*')
        .eq('program_instance_id', programId)
      expect(leaked.data).toEqual([])
      const illegal = await outsider.ctx.supabase.rpc('change_program_return_v1', {
        p_program_id: programId,
        p_expected_version: ending.program.stateVersion,
        p_request_id: crypto.randomUUID(),
        p_action: 'apply',
        p_settings: settings,
        p_changes: [],
        p_pending_decision_ids: [],
      })
      expect(illegal.error?.message).toContain('PROGRAM_NOT_ACTIVE')
      const { exportAccountData } = await import('../src/account/data-rights')
      const exported = await exportAccountData(ctx)
      expect(exported.data.program_return_periods).toHaveLength(1)
      expect(exported.data.program_load_adjustments).toHaveLength(3)
    }, 60000)
    it('persists fixed overrides in pounds and applies them before equipment conversion', async () => {
      const id = `custom-${crypto.randomUUID()}-return`
      const definition: TemplateDefinition = {
        schemaVersion: '2026.06.dsl',
        id,
        name: 'Custom return',
        daysPerWeek: 1,
        durationWeeks: 1,
        requiredState: [{ key: 'shared_custom', movementId: 'squat', type: 'manual' }],
        timelineDescription: 'Return contract',
        sessions: [
          {
            id: 'day',
            title: 'Day',
            estimatedMinutes: 30,
            slots: [
              { id: 'main', role: 'main', movementId: 'squat', prescriptionId: 'main' },
              {
                id: 'fixed',
                role: 'accessory',
                movementId: 'lat_pulldown',
                prescriptionId: 'fixed',
              },
              { id: 'warmup', role: 'warmup', movementId: 'squat', prescriptionId: 'zero' },
            ],
          },
        ],
        weeks: [
          {
            label: 'Week 1',
            phaseKey: 'base',
            phaseLabel: 'Base',
            summary: 'Return build',
            hardness: 'Medium',
            prescriptions: {
              main: {
                targetSummary: 'Ramp',
                progressionRuleId: 'simple_linear_completion',
                sets: [0.6, 0.7, 0.8].map((percent) => ({
                  targetLoad: {
                    kind: 'percent_of_state',
                    stateKey: 'shared_custom',
                    stateType: 'manual',
                    percent,
                    default: 'low',
                  },
                  targetReps: 5,
                })),
              },
              fixed: {
                targetSummary: 'Fixed',
                sets: Array.from({ length: 3 }, () => ({
                  targetLoad: { kind: 'fixed', kg: 20, lb: 45 },
                  targetReps: 8,
                })),
              },
              zero: {
                targetSummary: 'Warmup',
                sets: Array.from({ length: 2 }, () => ({
                  targetLoad: { kind: 'fixed', kg: 0, lb: 0 },
                  targetReps: 5,
                })),
              },
            },
          },
        ],
      }
      const { ctx, programId } = await fixture(undefined, definition, 'lb')
      const state = await getReturnGuide(ctx)
      const preview = buildReturnPreview(state.program, { scheduledDate: '2026-09-06' })
      expect(preview.changes.filter((change) => change.kind === 'state')).toHaveLength(1)
      await changeProgramReturn(
        ctx,
        returnChangeInput(state, preview.settings, preview.changes, 'apply', crypto.randomUUID()),
      )
      const session = await startSession(ctx, {
        clientMutationId: crypto.randomUUID(),
        timeZone: 'UTC',
      })
      expect(session.movements[0].sets).toHaveLength(3)
      expect(session.movements[1].sets.map((set) => set.targetLoad)).toEqual([35, 35])
      expect(session.movements[2].sets.map((set) => set.targetLoad)).toEqual([0, 0])
      await discardSession(ctx, { sessionId: session.sessionId })
      const ending = await getReturnGuide(ctx)
      await changeProgramReturn(
        ctx,
        returnChangeInput(ending, preview.settings, [], 'end', crypto.randomUUID()),
      )
      const legacy = await ctx.supabase.rpc('start_session_v2', {
        p_client_mutation_id: crypto.randomUUID(),
        p_program_instance_id: programId,
        p_planned_session_id: 'day-w1',
        p_scheduled_date: '2026-09-06',
        p_prescription_snapshot: {},
        p_expected_program_version: ending.program.stateVersion + 1,
        p_source_session_id: null,
      })
      expect(legacy.error?.message).toContain('RETURN_CLIENT_UPDATE_REQUIRED')
      const { previewProgramEquipmentMode, setProgramEquipmentMode } =
        await import('../src/program/equipment-mode')
      const equipment = await previewProgramEquipmentMode(ctx, {
        programId,
        targetMode: 'free_weight',
      })
      const active = (await getActiveProgram(ctx))!
      await setProgramEquipmentMode(ctx, {
        programId,
        targetMode: 'free_weight',
        expectedStateVersion: active.stateVersion,
        freeWeightPolicyVersionId: equipment.policy!.id,
        freeWeightPolicyChecksum: equipment.policy!.checksum,
        freeWeightChoices: equipment.changes.map(
          ({
            templateSessionId,
            slotId,
            phaseKey,
            role,
            sourceMovementId,
            replacementMovementId,
            policyRuleId,
          }) => ({
            templateSessionId,
            slotId,
            phaseKey,
            role,
            sourceMovementId,
            replacementMovementId,
            policyRuleId,
          }),
        ),
      })
      const converted = await startSession(ctx, {
        clientMutationId: crypto.randomUUID(),
        timeZone: 'UTC',
      })
      expect(converted.movements[1].sets.every((set) => set.targetLoad === null)).toBe(true)
      expect(converted.movements[2].sets.every((set) => set.targetLoad === 0)).toBe(true)
      await discardSession(ctx, { sessionId: converted.sessionId })
    }, 60000)
  },
)
