import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@sheetless/domain/shared/types/database'
import type { TemplateDefinition } from '@sheetless/domain/program/types'
import type { SessionSummary, WorkoutSession } from '@sheetless/domain/session/types'

/** Local-only, disposable programme with real start/log/finish receipts. */
export async function createSessionReceiptFixture(config: { structuredBlockEnd?: boolean } = {}) {
  const local = JSON.parse(execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
    cwd: '../..', encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }))
  if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(local.API_URL)) throw new Error('Local Supabase required')
  const options = { auth: { persistSession: false, autoRefreshToken: false } }
  const admin = createClient<Database>(local.API_URL, local.SERVICE_ROLE_KEY, options)
  const email = `session-receipt-${crypto.randomUUID()}@example.test`
  const password = crypto.randomUUID() + 'aA1!'
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (created.error || !created.data.user) throw created.error ?? new Error('Missing fixture user')
  const user = created.data.user
  const cleanup = async () => {
    const result = await admin.auth.admin.deleteUser(user.id)
    if (result.error) throw result.error
  }
  try {
    const authenticated = createClient<Database>(local.API_URL, local.ANON_KEY, options)
    const signedIn = await authenticated.auth.signInWithPassword({ email, password })
    if (signedIn.error) throw signedIn.error
    const profile = await admin.from('profiles').insert({
      id: user.id, email, units: 'kg', rounding: 2.5, auto_start_timer: false,
      onboarding_completed: true, live_onboarding_dismissed: true,
      post_workout_feedback_dismissed: true,
    })
    if (profile.error) throw profile.error
    const version = await admin.from('program_template_versions').select('id, definition')
      .eq('template_id', config.structuredBlockEnd ? 'healthy-531-fsl' : 'generic_alternating_5x5_lp').order('created_at', { ascending: false }).limit(1).single()
    if (version.error) throw version.error
    const definition = version.data.definition as unknown as TemplateDefinition
    const programme = await admin.from('program_instances').insert({
      user_id: user.id, template_id: definition.id, template_version_id: version.data.id,
      title: 'Receipt regression', status: 'active', start_date: new Date().toISOString().slice(0, 10),
      units: 'kg', rounding: 2.5, current_week_index: config.structuredBlockEnd ? definition.durationWeeks * definition.daysPerWeek - 1 : 0,
    }).select('id').single()
    if (programme.error) throw programme.error
    const states = await admin.from('program_state_values').insert(definition.requiredState.map((state) => ({
      user_id: user.id, program_instance_id: programme.data.id, key: state.key,
      movement_id: state.movementId, state_type: state.type, value: 100, unit: 'kg',
    })))
    if (states.error) throw states.error
    const runData = <T>(action: 'start' | 'finish', sessionId?: string): T => JSON.parse(execFileSync(
      'pnpm', ['exec', 'tsx', fileURLToPath(new URL('./session-receipt-data.ts', import.meta.url))],
      {
        input: JSON.stringify({ action, sessionId, apiUrl: local.API_URL, anonKey: local.ANON_KEY, email, password }),
        encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 30000,
      },
    )) as T
    const session = runData<WorkoutSession>('start')
    return {
      credentials: { email, password }, sessionId: session.sessionId, cleanup,
      async raceCycleChoices(other: 'repeat' | 'end') {
        const decisions = await authenticated.from('progression_decisions').select('id')
          .eq('program_instance_id', programme.data.id).eq('status', 'pending')
        if (decisions.error) throw decisions.error
        if (decisions.data.length) {
          const reviewed = await authenticated.rpc('resolve_progression_decisions_v2', {
            p_decision_ids: decisions.data.map(row => row.id), p_action: 'dismissed', p_request_id: crypto.randomUUID(),
          })
          if (reviewed.error) throw reviewed.error
        }
        const program = await authenticated.from('program_instances').select('state_version').eq('id', programme.data.id).single()
        const boundary = await authenticated.from('program_cycle_boundaries').select('id').eq('program_instance_id', programme.data.id).eq('status', 'pending').single()
        if (program.error || boundary.error) throw program.error ?? boundary.error
        const input = { p_program_id: programme.data.id, p_boundary_id: boundary.data.id,
          p_expected_version: program.data.state_version, p_request_id: crypto.randomUUID(), p_expected_user_id: user.id }
        const results = await Promise.all([
          authenticated.rpc('repeat_program_cycle_v1', input),
          other === 'repeat' ? authenticated.rpc('repeat_program_cycle_v1', input)
            : authenticated.rpc('end_program_v1', { p_program_id: programme.data.id,
              p_expected_version: program.data.state_version, p_request_id: crypto.randomUUID() }),
        ])
        return { results, previousVersion: program.data.state_version }
      },
      async cycleState() {
        const [boundaries, repeats, program, sessions] = await Promise.all([
          authenticated.from('program_cycle_boundaries').select('*').eq('program_instance_id', programme.data.id),
          authenticated.from('program_cycle_repeat_receipts').select('*').eq('user_id', user.id),
          authenticated.from('program_instances').select('status,current_week_index,state_version').eq('id', programme.data.id).single(),
          authenticated.from('workout_sessions').select('id,status').eq('user_id', user.id),
        ])
        const error = boundaries.error ?? repeats.error ?? program.error ?? sessions.error
        if (error) throw error
        return { boundaries: boundaries.data!, repeats: repeats.data!, program: program.data!, sessions: sessions.data! }
      },
      async finish() {
        return runData<SessionSummary>('finish', session.sessionId)
      },
      async receipts() {
        const result = await authenticated.from('progression_decisions')
          .select('id, status, previous_value, recommended_value, state_key')
          .eq('user_id', user.id).eq('session_id', session.sessionId).order('id')
        if (result.error) throw result.error
        return result.data
      },
      async stateValues() {
        const result = await authenticated.from('program_state_values').select('key, value')
          .eq('program_instance_id', programme.data.id).eq('user_id', user.id)
        if (result.error) throw result.error
        return result.data
      },
    }
  } catch (error) {
    await cleanup()
    throw error
  }
}
