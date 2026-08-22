/* global console, process */

import { URL } from 'node:url'
import postgres from 'postgres'

const databaseUrl = process.env.SUPABASE_DB_URL
if (!databaseUrl) {
  console.error('SUPABASE_DB_URL is required for the read-only release integrity audit.')
  process.exit(1)
}

const hostname = new URL(databaseUrl).hostname
const sql = postgres(databaseUrl, {
  max: 1,
  prepare: false,
  connect_timeout: 10,
  idle_timeout: 2,
  ssl: ['localhost', '127.0.0.1'].includes(hostname) ? false : 'require',
})

const checks = [
  {
    name: 'users with multiple active programmes',
    query: `
      select count(*)::integer as violations
      from (
        select user_id
        from public.program_instances
        where status = 'active'
        group by user_id
        having count(*) > 1
      ) as duplicates
    `,
  },
  {
    name: 'users with multiple in-progress workouts',
    query: `
      select count(*)::integer as violations
      from (
        select user_id
        from public.workout_sessions
        where status = 'in_progress'
        group by user_id
        having count(*) > 1
      ) as duplicates
    `,
  },
  {
    name: 'programmed workouts without a restore-safe discard journal',
    query: `
      select count(*)::integer as violations
      from public.workout_sessions as session
      where session.status = 'in_progress'
        and session.program_instance_id is not null
        and coalesce(
          (to_jsonb(session)->>'discard_journal_version')::integer,
          0
        ) < 1
    `,
  },
  {
    name: 'programme/template-version mismatches',
    query: `
      select count(*)::integer as violations
      from public.program_instances as child
      join public.program_template_versions as parent
        on parent.id = child.template_version_id
      where child.template_id <> parent.template_id
    `,
  },
  {
    name: 'cross-owner custom-template programme pins',
    query: `
      select count(*)::integer as violations
      from public.program_instances as program
      join public.program_templates as template
        on template.id = program.template_id
      where template.created_by is not null
        and program.user_id <> template.created_by
    `,
  },
  {
    name: 'pending decisions attached to inactive programmes',
    query: `
      select count(*)::integer as violations
      from public.progression_decisions as decision
      join public.program_instances as program
        on program.id = decision.program_instance_id
       and program.user_id = decision.user_id
      where decision.status = 'pending'
        and program.status <> 'active'
    `,
  },
  {
    name: 'cross-owner workout/programme rows',
    query: `
      select count(*)::integer as violations
      from public.workout_sessions as child
      join public.program_instances as parent on parent.id = child.program_instance_id
      where child.user_id <> parent.user_id
    `,
  },
  {
    name: 'cross-owner repeated-workout rows',
    query: `
      select count(*)::integer as violations
      from public.workout_sessions as child
      join public.workout_sessions as parent on parent.id = child.source_session_id
      where child.user_id <> parent.user_id
    `,
  },
  {
    name: 'cross-owner exercise/session rows',
    query: `
      select count(*)::integer as violations
      from public.exercise_logs as child
      join public.workout_sessions as parent on parent.id = child.session_id
      where child.user_id <> parent.user_id
    `,
  },
  {
    name: 'cross-owner set/exercise rows',
    query: `
      select count(*)::integer as violations
      from public.set_logs as child
      join public.exercise_logs as parent on parent.id = child.exercise_log_id
      where child.user_id <> parent.user_id
    `,
  },
  {
    name: 'cross-owner substitution/session rows',
    query: `
      select count(*)::integer as violations
      from public.substitution_logs as child
      join public.workout_sessions as parent on parent.id = child.session_id
      where child.user_id <> parent.user_id
    `,
  },
  {
    name: 'cross-owner progression/programme rows',
    query: `
      select count(*)::integer as violations
      from public.progression_decisions as child
      join public.program_instances as parent on parent.id = child.program_instance_id
      where child.user_id <> parent.user_id
    `,
  },
  {
    name: 'cross-owner programme child rows',
    query: `
      select
        (
          (select count(*) from public.program_state_values child join public.program_instances parent on parent.id = child.program_instance_id where child.user_id <> parent.user_id) +
          (select count(*) from public.program_movement_overrides child join public.program_instances parent on parent.id = child.program_instance_id where child.user_id <> parent.user_id) +
          (select count(*) from public.program_accessory_additions child join public.program_instances parent on parent.id = child.program_instance_id where child.user_id <> parent.user_id)
        )::integer as violations
    `,
  },
  {
    name: 'cross-owner movement-override source rows',
    query: `
      select
        (
          (select count(*) from public.program_movement_overrides child join public.workout_sessions parent on parent.id = child.source_session_id where child.user_id <> parent.user_id) +
          (select count(*) from public.program_movement_overrides child join public.exercise_logs parent on parent.id = child.source_exercise_log_id where child.user_id <> parent.user_id)
        )::integer as violations
    `,
  },
  {
    name: 'cross-owner journal rows',
    query: `
      select count(*)::integer as violations
      from public.session_program_change_journal as child
      join public.workout_sessions as session on session.id = child.session_id
      join public.program_instances as program on program.id = child.program_instance_id
      where child.user_id <> session.user_id
        or child.user_id <> program.user_id
    `,
  },
  {
    name: 'cross-owner feedback references',
    query: `
      select
        (
          (select count(*) from public.feedback_events child join public.workout_sessions parent on parent.id = child.session_id where child.user_id <> parent.user_id) +
          (select count(*) from public.feedback_events child join public.progression_decisions parent on parent.id = child.decision_id where child.user_id <> parent.user_id)
        )::integer as violations
    `,
  },
  {
    name: 'out-of-range set rows',
    query: `
      select count(*)::integer as violations
      from public.set_logs
      where set_index not between 0 and 1000
        or actual_load not between 0 and 100000
        or actual_reps not between 0 and 1000
        or actual_rir not between 0 and 10
        or actual_rpe not between 0 and 10
        or target_load not between 0 and 100000
        or target_reps not between 0 and 1000
        or target_rep_min not between 0 and 1000
        or target_rep_max not between 0 and 1000
        or target_rep_min > target_rep_max
        or target_rir not between 0 and 10
        or target_rpe not between 0 and 10
    `,
  },
]

let failed = false
try {
  await sql.begin('read only', async (transaction) => {
    for (const check of checks) {
      const [result] = await transaction.unsafe(check.query)
      const violations = Number(result?.violations ?? 0)
      const status = violations === 0 ? 'ok' : `FAIL (${violations})`
      console.log(`${status}  ${check.name}`)
      if (violations !== 0) failed = true
    }
  })
} catch (error) {
  console.error('Release integrity audit could not complete.')
  console.error(error instanceof Error ? error.message : String(error))
  failed = true
} finally {
  await sql.end({ timeout: 2 })
}

if (failed) process.exit(1)
console.log('Release integrity audit passed')
