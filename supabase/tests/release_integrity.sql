begin;

select plan(114);

select has_column('public', 'program_instances', 'state_version');
select has_column('public', 'program_instances', 'client_mutation_id');
select has_column('public', 'workout_sessions', 'finish_request_id');
select has_column('public', 'workout_sessions', 'finish_payload_hash');
select has_column('public', 'workout_sessions', 'discard_journal_version');
select has_column('public', 'workout_sessions', 'state_version');
select has_column('public', 'program_template_versions', 'definition_checksum');
select has_table('public', 'session_mutation_receipts');
select col_has_check(
  'public',
  'workout_sessions',
  'finish_payload_hash',
  'finish replay hashes have a database check constraint'
);

select has_index('public', 'program_instances', 'program_instances_one_active_per_user_idx');
select has_index('public', 'workout_sessions', 'workout_sessions_one_in_progress_per_user_idx');
select has_index('public', 'workout_sessions', 'workout_sessions_user_client_mutation_id_idx');
select has_index('public', 'set_logs', 'set_logs_user_client_mutation_id_idx');
select has_index('public', 'session_mutation_receipts', 'session_mutation_receipts_session_idx');
select has_index('public', 'exercise_logs', 'exercise_logs_user_created_idx');
select has_index('public', 'substitution_logs', 'substitution_logs_user_session_created_idx');
select has_index('public', 'exercise_logs', 'exercise_logs_user_planned_created_idx');
select has_index('public', 'exercise_logs', 'exercise_logs_user_performed_created_idx');
select has_index('public', 'exercise_logs', 'exercise_logs_user_session_order_idx');
select has_index('public', 'workout_sessions', 'workout_sessions_user_program_status_scheduled_idx');

select has_function('public', 'start_program_v2');
select has_function('public', 'start_session_v2');
select has_function('public', 'start_ad_hoc_session_v2');
select has_function('public', 'finish_session_v2');
select has_function('public', 'resolve_progression_decisions_v2');
select has_function('public', 'upsert_session_set_v2');
select has_function('public', 'discard_workout_session');
select has_function('public', 'delete_own_account');
select has_function('public', 'rename_session_v2');
select has_function('public', 'add_session_accessory_v2');
select has_function('public', 'reorder_session_accessories_v2');
select has_function('public', 'remove_session_accessory_v2');
select has_function('public', 'add_ad_hoc_exercise_v2');
select has_function('public', 'remove_ad_hoc_exercise_v2');
select has_function('public', 'add_session_set_v2');
select has_function(
  'public',
  'substitute_session_movement_v2',
  array['uuid', 'text', 'integer', 'jsonb', 'uuid', 'text', 'text', 'text', 'text', 'text', 'jsonb'],
  'movement substitution atomically persists the generated previous comparable'
);
select has_function('public', 'claim_session_mutation_v2');
select has_function('public', 'set_session_favorite_v2');
select has_function('public', 'advance_program_position_v2');
select has_function('public', 'create_custom_program_template_v2');
select has_trigger(
  'public',
  'program_template_versions',
  'protect_pinned_template_version',
  'pinned template versions are immutable'
);

select col_is_fk(
  'public',
  'program_instances',
  array['template_version_id', 'template_id'],
  'programme template and pinned version must match'
);
select col_is_fk(
  'public',
  'workout_sessions',
  array['source_session_id', 'user_id'],
  'repeated workouts must reference a same-owner source'
);
select col_is_fk(
  'public',
  'exercise_logs',
  array['session_id', 'user_id'],
  'exercise logs must belong to a same-owner session'
);
select col_is_fk(
  'public',
  'program_movement_overrides',
  array['source_session_id', 'user_id'],
  'movement overrides must reference a same-owner source session'
);
select col_is_fk(
  'public',
  'program_movement_overrides',
  array['source_exercise_log_id', 'user_id'],
  'movement overrides must reference a same-owner source exercise'
);
select col_is_fk(
  'public',
  'set_logs',
  array['exercise_log_id', 'user_id'],
  'set logs must belong to a same-owner exercise'
);
select col_is_fk(
  'public',
  'progression_decisions',
  array['program_instance_id', 'user_id'],
  'decisions must belong to a same-owner programme'
);

select function_privs_are(
  'public',
  'discard_workout_session_unsafe_internal',
  array['uuid'],
  'authenticated',
  array[]::text[],
  'unsafe discard is not executable by authenticated clients'
);
select function_privs_are(
  'public',
  'delete_own_account',
  array['text'],
  'authenticated',
  array['EXECUTE'],
  'authenticated clients can execute only the guarded self-delete function'
);
select function_privs_are(
  'public',
  'claim_session_mutation_v2',
  array['uuid', 'text', 'text', 'text', 'integer'],
  'authenticated',
  array[]::text[],
  'authenticated clients cannot claim mutation receipts directly'
);
select function_privs_are(
  'public',
  'validate_previous_comparable_v2',
  array['jsonb', 'text'],
  'authenticated',
  array[]::text[],
  'authenticated clients cannot bypass substitution comparable validation'
);
select function_privs_are(
  'public',
  'session_set_program_movement_override',
  array['uuid', 'text', 'text', 'text', 'text', 'text', 'uuid', 'boolean'],
  'authenticated',
  array[]::text[],
  'future movement journal writes are internal to atomic session mutations'
);
select function_privs_are(
  'public',
  'session_insert_program_accessory_addition',
  array['uuid', 'text', 'text', 'text', 'text', 'text', 'text', 'jsonb', 'text', 'text', 'integer'],
  'authenticated',
  array[]::text[],
  'future accessory inserts are internal to atomic session mutations'
);
select function_privs_are(
  'public',
  'session_reorder_program_accessory_additions',
  array['uuid', 'uuid[]', 'integer[]'],
  'authenticated',
  array[]::text[],
  'future accessory reorders are internal to atomic session mutations'
);
select function_privs_are(
  'public',
  'session_remove_program_accessory_addition',
  array['uuid', 'uuid', 'uuid[]'],
  'authenticated',
  array[]::text[],
  'future accessory removals are internal to atomic session mutations'
);

select function_privs_are(
  'public',
  'set_session_favorite_v2',
  array['uuid', 'boolean', 'text'],
  'authenticated',
  array['EXECUTE'],
  'authenticated clients can execute the guarded favourite mutation'
);
select function_privs_are(
  'public',
  'advance_program_position_v2',
  array['uuid', 'integer', 'integer'],
  'authenticated',
  array['EXECUTE'],
  'authenticated clients can execute guarded programme advancement'
);
select function_privs_are(
  'public',
  'create_custom_program_template_v2',
  array['jsonb', 'jsonb'],
  'authenticated',
  array['EXECUTE'],
  'authenticated clients can atomically create owned custom templates'
);

select table_privs_are(
  'public',
  'program_templates',
  'authenticated',
  array['SELECT'],
  'authenticated clients have read-only programme-template table access'
);
select table_privs_are(
  'public',
  'program_template_versions',
  'authenticated',
  array['SELECT'],
  'authenticated clients have read-only template-version table access'
);
select table_privs_are(
  'public',
  'program_instances',
  'authenticated',
  array['SELECT'],
  'authenticated clients have read-only programme-instance table access'
);
select table_privs_are(
  'public',
  'program_state_values',
  'authenticated',
  array['SELECT'],
  'authenticated clients have read-only programme-state table access'
);
select table_privs_are(
  'public',
  'program_movement_overrides',
  'authenticated',
  array['SELECT'],
  'authenticated clients have read-only movement-override table access'
);
select table_privs_are(
  'public',
  'program_accessory_additions',
  'authenticated',
  array['SELECT'],
  'authenticated clients have read-only programme-accessory table access'
);
select table_privs_are(
  'public',
  'workout_sessions',
  'authenticated',
  array['SELECT'],
  'authenticated clients have read-only workout-session table access'
);
select table_privs_are(
  'public',
  'exercise_logs',
  'authenticated',
  array['SELECT'],
  'authenticated clients have read-only exercise-log table access'
);
select table_privs_are(
  'public',
  'set_logs',
  'authenticated',
  array['SELECT'],
  'authenticated clients have read-only set-log table access'
);
select table_privs_are(
  'public',
  'substitution_logs',
  'authenticated',
  array['SELECT'],
  'authenticated clients have read-only substitution-log table access'
);
select table_privs_are(
  'public',
  'progression_decisions',
  'authenticated',
  array['SELECT'],
  'authenticated clients have read-only progression-decision table access'
);
select table_privs_are(
  'public',
  'session_program_change_journal',
  'authenticated',
  array['SELECT'],
  'authenticated clients have read-only session-journal table access'
);

select throws_ok(
  $$ select public.validate_session_snapshot_v2('{"movements":{}}'::jsonb) $$,
  '22023',
  'VALIDATION_FAILED',
  'malformed workout snapshots fail closed'
);

insert into auth.users (id, email)
values ('00000000-0000-4000-8000-000000000091', 'release-integrity@example.test');

insert into public.profiles (id, email)
values ('00000000-0000-4000-8000-000000000091', 'release-integrity@example.test');

insert into public.workout_sessions (
  id,
  user_id,
  program_instance_id,
  planned_session_id,
  status,
  prescription_snapshot,
  state_version
) values (
  '00000000-0000-4000-8000-000000000092',
  '00000000-0000-4000-8000-000000000091',
  null,
  null,
  'in_progress',
  '{"id":"ad-hoc","title":"Old name","movements":[]}'::jsonb,
  0
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000091',
  true
);

select throws_ok(
  $$
    select public.rename_session_v2(
      '00000000-0000-4000-8000-000000000092',
      'New name',
      'stale-request',
      1
    )
  $$,
  '40001',
  'CONFLICT',
  'a stale workout version cannot mutate the session'
);

select is(
  public.rename_session_v2(
    '00000000-0000-4000-8000-000000000092',
    'New name',
    'rename-request',
    0
  )->>'stateVersion',
  '1',
  'the first mutation returns its incremented workout version'
);

select is(
  public.rename_session_v2(
    '00000000-0000-4000-8000-000000000092',
    'New name',
    'rename-request',
    0
  )->>'stateVersion',
  '1',
  'an exact replay returns the durable receipt version'
);

select throws_ok(
  $$
    select public.rename_session_v2(
      '00000000-0000-4000-8000-000000000092',
      'Different payload',
      'rename-request',
      1
    )
  $$,
  '40001',
  'IDEMPOTENCY_CONFLICT',
  'a request token cannot be reused with a different payload'
);

select is(
  (
    select state_version::text
    from public.workout_sessions
    where id = '00000000-0000-4000-8000-000000000092'
  ),
  '1',
  'an exact replay does not increment the workout version twice'
);

select is(
  (
    select count(*)::text
    from public.session_mutation_receipts
    where user_id = '00000000-0000-4000-8000-000000000091'
  ),
  '1',
  'one durable receipt is recorded for the successful mutation'
);

insert into public.movements (id, name, category)
values ('release-integrity-movement', 'Release integrity movement', 'accessory');

select is(
  public.add_ad_hoc_exercise_v2(
    '00000000-0000-4000-8000-000000000092',
    'add-exercise-request',
    1,
    '{"movementId":"release-integrity-movement"}'::jsonb,
    '{
      "slotId":"release-integrity-slot",
      "movementId":"release-integrity-movement",
      "role":"accessory",
      "orderIndex":0,
      "targetSummary":"Optional accessory"
    }'::jsonb,
    '[]'::jsonb,
    '{
      "id":"ad-hoc",
      "title":"New name",
      "movements":[{
        "id":"release-integrity-slot",
        "slotId":"release-integrity-slot",
        "movementId":"release-integrity-movement",
        "orderIndex":0,
        "sets":[]
      }]
    }'::jsonb
  )->>'stateVersion',
  '2',
  'a structural workout mutation records its incremented version'
);

update public.workout_sessions
set status = 'completed'
where id = '00000000-0000-4000-8000-000000000092';

select is(
  public.add_ad_hoc_exercise_v2(
    '00000000-0000-4000-8000-000000000092',
    'add-exercise-request',
    1,
    '{"movementId":"release-integrity-movement"}'::jsonb,
    'null'::jsonb,
    'null'::jsonb,
    'null'::jsonb
  )->>'stateVersion',
  '2',
  'an exact structural replay succeeds after completion and before derived payload validation'
);

select throws_ok(
  $$
    select public.add_ad_hoc_exercise_v2(
      '00000000-0000-4000-8000-000000000092',
      'add-exercise-request',
      2,
      '{"movementId":"different-movement"}'::jsonb,
      'null'::jsonb,
      'null'::jsonb,
      'null'::jsonb
    )
  $$,
  '40001',
  'IDEMPOTENCY_CONFLICT',
  'structural replay matching is based on stable caller intent'
);

select is(
  public.set_session_favorite_v2(
    '00000000-0000-4000-8000-000000000092',
    true,
    'Root favourite'
  ),
  '00000000-0000-4000-8000-000000000092'::uuid,
  'a completed ad-hoc workout can be favourited through the guarded RPC'
);

insert into public.workout_sessions (
  id,
  user_id,
  program_instance_id,
  planned_session_id,
  source_session_id,
  status,
  prescription_snapshot
) values
  (
    '00000000-0000-4000-8000-000000000093',
    '00000000-0000-4000-8000-000000000091',
    null,
    null,
    '00000000-0000-4000-8000-000000000092',
    'completed',
    '{"id":"repeat-one","title":"Repeat one","movements":[]}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000094',
    '00000000-0000-4000-8000-000000000091',
    null,
    null,
    '00000000-0000-4000-8000-000000000093',
    'completed',
    '{"id":"repeat-two","title":"Repeat two","movements":[]}'::jsonb
  );

select is(
  public.set_session_favorite_v2(
    '00000000-0000-4000-8000-000000000094',
    true,
    'Deep repeat'
  ),
  '00000000-0000-4000-8000-000000000094'::uuid,
  'favouriting a nested repeat resolves the full workout lineage'
);

select is(
  (
    select count(*)::text
    from public.workout_sessions
    where user_id = '00000000-0000-4000-8000-000000000091'
      and is_favorite
  ),
  '1',
  'exactly one workout in a repeat lineage remains favourited'
);

select is(
  (
    select prescription_snapshot->>'title'
    from public.workout_sessions
    where id = '00000000-0000-4000-8000-000000000094'
  ),
  'Deep repeat',
  'favouriting updates the selected workout title in the same transaction'
);

select is(
  (
    select count(*)::text
    from public.workout_sessions
    where user_id = '00000000-0000-4000-8000-000000000091'
      and is_favorite
  ),
  '0',
  'unfavouriting any repeat clears the full workout lineage'
)
from (
  select public.set_session_favorite_v2(
    '00000000-0000-4000-8000-000000000093',
    false,
    null
  )
) as mutation;

select is(
  public.create_custom_program_template_v2(
    '{
      "id":"custom-00000000-release-integrity",
      "name":"Release integrity template",
      "description":"A transactional custom template.",
      "daysPerWeek":1,
      "progressionLabel":"Manual",
      "complexity":"Beginner",
      "schemaVersion":"2026.06.dsl",
      "tags":["custom","test"]
    }'::jsonb,
    '{
      "schemaVersion":"2026.06.dsl",
      "id":"custom-00000000-release-integrity",
      "name":"Release integrity template",
      "durationWeeks":1,
      "daysPerWeek":1,
      "requiredState":[],
      "timelineDescription":"Database contract fixture.",
      "sessions":[{"id":"day-1","title":"Day 1","slots":[]}],
      "weeks":[{"label":"Week 1","phaseKey":"base","prescriptions":{}}],
      "progressionRules":{"manual":"Keep load stable."}
    }'::jsonb
  ),
  'custom-00000000-release-integrity',
  'custom template metadata and version are created atomically'
);

select is(
  (
    select created_by::text
    from public.program_templates
    where id = 'custom-00000000-release-integrity'
  ),
  '00000000-0000-4000-8000-000000000091',
  'the custom template is owned by the authenticated account'
);

select is(
  (
    select count(*)::text
    from public.program_template_versions
    where template_id = 'custom-00000000-release-integrity'
      and version = '1'
  ),
  '1',
  'custom template creation always includes its first immutable version'
);

insert into public.program_instances (
  id,
  user_id,
  template_id,
  template_version_id,
  title,
  status,
  start_date,
  units,
  rounding,
  current_week_index,
  state_version
) values (
  '00000000-0000-4000-8000-000000000095',
  '00000000-0000-4000-8000-000000000091',
  'custom-00000000-release-integrity',
  (
    select id
    from public.program_template_versions
    where template_id = 'custom-00000000-release-integrity'
      and version = '1'
  ),
  'Release integrity programme',
  'active',
  current_date,
  'kg',
  2.5,
  0,
  0
);

select is(
  public.advance_program_position_v2(
    '00000000-0000-4000-8000-000000000095',
    0,
    2
  )->>'stateVersion',
  '1',
  'programme advancement increments the optimistic version once'
);

select is(
  (
    select current_week_index::text
    from public.program_instances
    where id = '00000000-0000-4000-8000-000000000095'
  ),
  '2',
  'programme advancement persists the requested forward position'
);

select is(
  public.advance_program_position_v2(
    '00000000-0000-4000-8000-000000000095',
    0,
    2
  )->>'advanced',
  'false',
  'an exact programme-position replay converges without another write'
);

select is(
  (
    select state_version::text
    from public.program_instances
    where id = '00000000-0000-4000-8000-000000000095'
  ),
  '1',
  'an exact programme-position replay does not increment state twice'
);

select throws_ok(
  $$
    select public.advance_program_position_v2(
      '00000000-0000-4000-8000-000000000095',
      0,
      3
    )
  $$,
  '40001',
  'CONFLICT',
  'a stale programme version cannot advance to a different position'
);

select throws_ok(
  $$
    select public.advance_program_position_v2(
      '00000000-0000-4000-8000-000000000095',
      1,
      1
    )
  $$,
  '22023',
  'PROGRAM_POSITION_REGRESSION',
  'programme position cannot move backwards'
);

insert into public.movements (id, name, category)
values
  (
    'release-integrity-swap-original',
    'Release integrity swap original',
    'accessory'
  ),
  (
    'release-integrity-swap-replacement',
    'Release integrity swap replacement',
    'accessory'
  ),
  (
    'release-integrity-swap-alternate',
    'Release integrity swap alternate',
    'accessory'
  );

update public.movements
set equipment = array['bodyweight']::text[]
where id = 'release-integrity-swap-replacement';

create temporary table substitution_previous_fixtures (
  name text primary key,
  value jsonb not null
) on commit drop;

insert into substitution_previous_fixtures (name, value)
values (
  'valid',
  '{
    "movementId":"release-integrity-swap-replacement",
    "label":"Fabricated but structurally valid caller history",
    "load":999,
    "reps":99,
    "rir":0,
    "workoutDate":"2026-07-01",
    "timeZone":"Asia/Singapore",
    "performedAt":"2026-07-01T10:00:00+08:00",
    "e1rm":9999,
    "setType":"accessory",
    "sets":[
      {"setIndex":0,"load":999,"reps":99,"rir":0}
    ]
  }'::jsonb
);

insert into public.workout_sessions (
  id,
  user_id,
  program_instance_id,
  planned_session_id,
  status,
  scheduled_date,
  completed_at,
  prescription_snapshot,
  state_version
) values (
  '00000000-0000-4000-8000-000000000098',
  '00000000-0000-4000-8000-000000000091',
  null,
  null,
  'completed',
  '2026-07-29',
  '2026-07-29T02:00:00Z',
  '{
    "id":"substitution-history",
    "templateId":"substitution-template",
    "title":"Substitution history",
    "scheduledDate":"2026-07-29",
    "timeZone":"Asia/Singapore",
    "units":"kg",
    "movements":[]
  }'::jsonb,
  0
);

insert into public.exercise_logs (
  id,
  user_id,
  session_id,
  slot_id,
  planned_movement_id,
  performed_movement_id,
  role,
  order_index,
  target_summary
) values (
  '00000000-0000-4000-8000-000000000099',
  '00000000-0000-4000-8000-000000000091',
  '00000000-0000-4000-8000-000000000098',
  'release-integrity-swap-slot',
  'release-integrity-swap-original',
  'release-integrity-swap-replacement',
  'accessory',
  0,
  '2 × 10'
);

insert into public.set_logs (
  id,
  user_id,
  exercise_log_id,
  set_index,
  actual_load,
  actual_reps,
  actual_rir,
  completed
) values
  (
    '00000000-0000-4000-8000-000000000100',
    '00000000-0000-4000-8000-000000000091',
    '00000000-0000-4000-8000-000000000099',
    0,
    12.5,
    10,
    2,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000091',
    '00000000-0000-4000-8000-000000000099',
    1,
    12.5,
    9,
    2,
    true
  );

insert into public.workout_sessions (
  id,
  user_id,
  program_instance_id,
  planned_session_id,
  status,
  scheduled_date,
  prescription_snapshot,
  state_version
) values (
  '00000000-0000-4000-8000-000000000096',
  '00000000-0000-4000-8000-000000000091',
  null,
  null,
  'in_progress',
  '2026-07-30',
  '{
    "id":"substitution-integrity",
    "templateId":"substitution-template",
    "title":"Substitution integrity",
    "weekLabel":"Week 1",
    "scheduledDate":"2026-07-30",
    "timeZone":"Asia/Singapore",
    "units":"kg",
    "movements":[{
      "id":"release-integrity-swap-slot",
      "slotId":"release-integrity-swap-slot",
      "phaseKey":"fixture-phase",
      "movementId":"release-integrity-swap-original",
      "movementName":"Release integrity swap original",
      "role":"accessory",
      "orderIndex":0,
      "targetSummary":"3 × 10",
      "sets":[{"id":"set-0","setIndex":0,"targetReps":10}],
      "previous":{"stale":true}
    }]
  }'::jsonb,
  0
);

insert into public.exercise_logs (
  id,
  user_id,
  session_id,
  slot_id,
  planned_movement_id,
  performed_movement_id,
  role,
  order_index,
  target_summary
) values (
  '00000000-0000-4000-8000-000000000097',
  '00000000-0000-4000-8000-000000000091',
  '00000000-0000-4000-8000-000000000096',
  'release-integrity-swap-slot',
  'release-integrity-swap-original',
  'release-integrity-swap-original',
  'accessory',
  0,
  '3 × 10'
);

insert into public.set_logs (
  id,
  user_id,
  exercise_log_id,
  set_index,
  target_load,
  target_reps,
  actual_load,
  actual_reps,
  completed
) values (
  '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000091',
  '00000000-0000-4000-8000-000000000097',
  0,
  55,
  10,
  55,
  10,
  false
);

select is(
  public.substitute_session_movement_v2(
    '00000000-0000-4000-8000-000000000096',
    'substitution-valid-request',
    0,
    '{
      "exerciseLogId":"00000000-0000-4000-8000-000000000097",
      "performedMovementId":"release-integrity-swap-replacement",
      "reason":"preference",
      "note":"Database contract fixture",
      "scope":"session"
    }'::jsonb,
    '00000000-0000-4000-8000-000000000097',
    'release-integrity-swap-replacement',
    'preference',
    'Database contract fixture',
    'session',
    'fixture-phase',
    (
      select value
      from substitution_previous_fixtures
      where name = 'valid'
    )
  )->>'stateVersion',
  '1',
  'a valid substitution and generated previous comparable commit together'
);

select is(
  (
    select concat(
      prescription_snapshot #>> '{movements,0,previous,load}',
      ':',
      prescription_snapshot #>> '{movements,0,previous,reps}',
      ':',
      prescription_snapshot #>> '{movements,0,previous,workoutDate}',
      ':',
      prescription_snapshot #>> '{movements,0,previous,timeZone}',
      ':',
      prescription_snapshot #>> '{movements,0,previous,sets,1,reps}'
    )
    from public.workout_sessions
    where id = '00000000-0000-4000-8000-000000000096'
  ),
  '12.5:10:2026-07-29:Asia/Singapore:9',
  'the database ignores fabricated caller history and derives the canonical completed result'
);

select is(
  (
    select concat(
      prescription_snapshot #>> '{movements,0,performedMovementId}',
      ':',
      prescription_snapshot #>> '{movements,0,performedMovementName}'
    )
    from public.workout_sessions
    where id = '00000000-0000-4000-8000-000000000096'
  ),
  'release-integrity-swap-replacement:Release integrity swap replacement',
  'the snapshot movement identity changes in the same substitution'
);

select is(
  (
    select concat(
      exercise.performed_movement_id,
      ':',
      coalesce(active_set.actual_load::text, 'null')
    )
    from public.exercise_logs as exercise
    join public.set_logs as active_set
      on active_set.exercise_log_id = exercise.id
    where exercise.id = '00000000-0000-4000-8000-000000000097'
  ),
  'release-integrity-swap-replacement:null',
  'the exercise row changes and an untouched weighted seed is cleared for bodyweight'
);

select is(
  (
    select count(*)::text
    from public.substitution_logs
    where session_id = '00000000-0000-4000-8000-000000000096'
  ),
  '1',
  'the valid substitution writes one audit row'
);

select is(
  public.substitute_session_movement_v2(
    '00000000-0000-4000-8000-000000000096',
    'substitution-valid-request',
    0,
    '{
      "exerciseLogId":"00000000-0000-4000-8000-000000000097",
      "performedMovementId":"release-integrity-swap-replacement",
      "reason":"preference",
      "note":"Database contract fixture",
      "scope":"session"
    }'::jsonb,
    '00000000-0000-4000-8000-000000000097',
    'release-integrity-swap-replacement',
    'preference',
    'Database contract fixture',
    'session',
    '',
    '{"movementId":"malformed-derived-replay"}'::jsonb
  )->>'stateVersion',
  '1',
  'an exact substitution replay returns before regenerated values are validated'
);

select is(
  (
    select concat(
      session.state_version,
      ':',
      (
        select count(*)
        from public.substitution_logs
        where session_id = session.id
      )
    )
    from public.workout_sessions as session
    where session.id = '00000000-0000-4000-8000-000000000096'
  ),
  '1:1',
  'an exact substitution replay does not advance state or duplicate audit rows'
);

select is(
  public.substitute_session_movement_v2(
    '00000000-0000-4000-8000-000000000096',
    'substitution-clear-request',
    1,
    '{
      "exerciseLogId":"00000000-0000-4000-8000-000000000097",
      "performedMovementId":"release-integrity-swap-alternate",
      "reason":"equipment_missing",
      "note":null,
      "scope":"session"
    }'::jsonb,
    '00000000-0000-4000-8000-000000000097',
    'release-integrity-swap-alternate',
    'equipment_missing',
    null,
    'session',
    'fixture-phase',
    null
  )->>'stateVersion',
  '2',
  'a substitution without a comparable advances the session once'
);

select is(
  (
    select jsonb_typeof(
      prescription_snapshot #> '{movements,0,previous}'
    )
    from public.workout_sessions
    where id = '00000000-0000-4000-8000-000000000096'
  ),
  'null',
  'a null comparable clears the stale snapshot previous value'
);

select is(
  (
    select concat(
      exercise.performed_movement_id,
      ':',
      (
        select count(*)
        from public.substitution_logs
        where session_id = exercise.session_id
      )
    )
    from public.exercise_logs as exercise
    where exercise.id = '00000000-0000-4000-8000-000000000097'
  ),
  'release-integrity-swap-alternate:2',
  'clearing the comparable still updates the exercise and audit atomically'
);

select throws_ok(
  $$
    select public.substitute_session_movement_v2(
      '00000000-0000-4000-8000-000000000096',
      'substitution-noop-request',
      2,
      '{
        "exerciseLogId":"00000000-0000-4000-8000-000000000097",
        "performedMovementId":"release-integrity-swap-alternate",
        "reason":"preference",
        "note":null,
        "scope":"session"
      }'::jsonb,
      '00000000-0000-4000-8000-000000000097',
      'release-integrity-swap-alternate',
      'preference',
      null,
      'session',
      'fixture-phase',
      null
    )
  $$,
  'P0001',
  'MOVEMENT_ALREADY_SELECTED',
  'a no-op substitution cannot be reused to change its authorized scope'
);

select throws_ok(
  $$
    select public.substitute_session_movement_v2(
      '00000000-0000-4000-8000-000000000096',
      'substitution-mismatch-request',
      2,
      '{
        "exerciseLogId":"00000000-0000-4000-8000-000000000097",
        "performedMovementId":"squat",
        "reason":"preference",
        "note":null,
        "scope":"session"
      }'::jsonb,
      '00000000-0000-4000-8000-000000000097',
      'squat',
      'preference',
      null,
      'session',
      'fixture-phase',
      null
    )
  $$,
  'P0001',
  'MOVEMENT_SWAP_NOT_ALLOWED',
  'an unsupported replacement movement is rejected inside the atomic boundary'
);

select is(
  (
    select concat(
      session.state_version,
      ':',
      exercise.performed_movement_id,
      ':',
      jsonb_typeof(session.prescription_snapshot #> '{movements,0,previous}'),
      ':',
      (
        select count(*)
        from public.substitution_logs
        where session_id = session.id
      ),
      ':',
      (
        select count(*)
        from public.session_mutation_receipts
        where request_id = 'substitution-mismatch-request'
      )
    )
    from public.workout_sessions as session
    join public.exercise_logs as exercise
      on exercise.session_id = session.id
    where session.id = '00000000-0000-4000-8000-000000000096'
  ),
  '2:release-integrity-swap-alternate:null:2:0',
  'unsupported-movement rejection leaves snapshot, row, audit, receipt, and version unchanged'
);

select throws_ok(
  $$
    select public.substitute_session_movement_v2(
      '00000000-0000-4000-8000-000000000096',
      'substitution-malformed-request',
      2,
      '{
        "exerciseLogId":"00000000-0000-4000-8000-000000000097",
        "performedMovementId":"release-integrity-swap-replacement",
        "reason":"preference",
        "note":null,
        "scope":"session"
      }'::jsonb,
      '00000000-0000-4000-8000-000000000097',
      'release-integrity-swap-replacement',
      'preference',
      null,
      'session',
      'forged-phase',
      jsonb_set(
        (
          select value
          from substitution_previous_fixtures
          where name = 'valid'
        ),
        '{sets}',
        '{"not":"an array"}'::jsonb
      )
    )
  $$,
  '22023',
  'PHASE_KEY_MISMATCH',
  'a caller cannot persist an arbitrary programme phase key'
);

select is(
  (
    select concat(
      session.state_version,
      ':',
      exercise.performed_movement_id,
      ':',
      jsonb_typeof(session.prescription_snapshot #> '{movements,0,previous}'),
      ':',
      (
        select count(*)
        from public.substitution_logs
        where session_id = session.id
      ),
      ':',
      (
        select count(*)
        from public.session_mutation_receipts
        where request_id = 'substitution-malformed-request'
      )
    )
    from public.workout_sessions as session
    join public.exercise_logs as exercise
      on exercise.session_id = session.id
    where session.id = '00000000-0000-4000-8000-000000000096'
  ),
  '2:release-integrity-swap-alternate:null:2:0',
  'phase-key rejection rolls the entire attempted mutation back'
);

update public.set_logs
set completed = true
where id = '00000000-0000-4000-8000-000000000102';

select throws_ok(
  $$
    select public.substitute_session_movement_v2(
      '00000000-0000-4000-8000-000000000096',
      'substitution-after-logging-request',
      2,
      '{
        "exerciseLogId":"00000000-0000-4000-8000-000000000097",
        "performedMovementId":"release-integrity-swap-replacement",
        "reason":"preference",
        "note":null,
        "scope":"session"
      }'::jsonb,
      '00000000-0000-4000-8000-000000000097',
      'release-integrity-swap-replacement',
      'preference',
      null,
      'session',
      'fixture-phase',
      null
    )
  $$,
  'P0001',
  'MOVEMENT_SWAP_AFTER_LOGGING',
  'a completed set prevents retroactive movement reattribution'
);

select is(
  (
    select concat(
      session.state_version,
      ':',
      exercise.performed_movement_id,
      ':',
      (
        select count(*)
        from public.substitution_logs
        where session_id = session.id
      ),
      ':',
      (
        select count(*)
        from public.session_mutation_receipts
        where request_id = 'substitution-after-logging-request'
      )
    )
    from public.workout_sessions as session
    join public.exercise_logs as exercise
      on exercise.session_id = session.id
    where session.id = '00000000-0000-4000-8000-000000000096'
  ),
  '2:release-integrity-swap-alternate:2:0',
  'a rejected post-log swap leaves movement, audit, receipt, and version unchanged'
);

select is(
  public.substitute_session_movement_v2(
    '00000000-0000-4000-8000-000000000096',
    'substitution-clear-request',
    1,
    '{
      "exerciseLogId":"00000000-0000-4000-8000-000000000097",
      "performedMovementId":"release-integrity-swap-alternate",
      "reason":"equipment_missing",
      "note":null,
      "scope":"session"
    }'::jsonb,
    '00000000-0000-4000-8000-000000000097',
    'release-integrity-swap-alternate',
    'equipment_missing',
    null,
    'session',
    '',
    '{"malformed":"recomputed replay data"}'::jsonb
  )->>'stateVersion',
  '2',
  'an exact null-comparable replay returns its original durable version'
);

select is(
  (
    select concat(
      state_version,
      ':',
      (
        select count(*)
        from public.substitution_logs
        where session_id = '00000000-0000-4000-8000-000000000096'
      ),
      ':',
      (
        select count(*)
        from public.session_mutation_receipts
        where session_id = '00000000-0000-4000-8000-000000000096'
      )
    )
    from public.workout_sessions
    where id = '00000000-0000-4000-8000-000000000096'
  ),
  '2:2:2',
  'replaying either substitution intent remains idempotent after later mutations'
);

select * from finish();
rollback;
