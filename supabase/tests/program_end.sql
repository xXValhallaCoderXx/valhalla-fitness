begin;
select no_plan();

select has_table('public'::name, 'program_end_receipts'::name);
select ok(not has_function_privilege('anon', 'public.end_program_v1(uuid,integer,text)', 'EXECUTE'), 'anonymous callers cannot end plans');
select ok(has_function_privilege('authenticated', 'public.end_program_v1(uuid,integer,text)', 'EXECUTE'), 'authenticated callers use the guarded boundary');
select ok(not has_table_privilege('authenticated', 'public.program_end_receipts', 'INSERT'), 'clients cannot forge end receipts');
select ok(not has_table_privilege('authenticated', 'public.program_end_receipts', 'UPDATE'), 'clients cannot rewrite end receipts');
select ok(not has_table_privilege('authenticated', 'public.program_end_receipts', 'DELETE'), 'clients cannot remove end receipts');
select ok(not has_table_privilege('authenticated', 'public.program_instances', 'UPDATE'), 'clients cannot bypass end guards through direct programme writes');

insert into auth.users(id, email) values
  ('00000000-0000-4000-8000-000000009701', 'end-plan-one@example.test'),
  ('00000000-0000-4000-8000-000000009702', 'end-plan-two@example.test');
insert into public.profiles(id, email) values
  ('00000000-0000-4000-8000-000000009701', 'end-plan-one@example.test'),
  ('00000000-0000-4000-8000-000000009702', 'end-plan-two@example.test');
insert into public.program_instances(id, user_id, template_id, template_version_id, title, status, start_date, units, rounding, current_week_index, state_version)
select fixture.program_id, fixture.user_id, version.template_id, version.id, 'End plan contract', 'active', current_date, 'kg', 2.5, 3, 7
from (values
  ('00000000-0000-4000-8000-000000009711'::uuid, '00000000-0000-4000-8000-000000009701'::uuid),
  ('00000000-0000-4000-8000-000000009712'::uuid, '00000000-0000-4000-8000-000000009702'::uuid)
) fixture(program_id, user_id)
cross join lateral (select * from public.program_template_versions where template_id = 'generic_alternating_5x5_lp' order by created_at desc limit 1) version;
insert into public.program_state_values(user_id, program_instance_id, key, movement_id, state_type, value, unit)
values ('00000000-0000-4000-8000-000000009701', '00000000-0000-4000-8000-000000009711', 'end-contract-load', 'bench_press', 'working_load', 100, 'kg');

select set_config('request.jwt.claim.sub', '', true);
select throws_ok($$select public.end_program_v1('00000000-0000-4000-8000-000000009711', 7, 'unauthenticated')$$,
  '42501', 'AUTH_REQUIRED', 'identity is required even when calling as a privileged database role');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000009701', true);
select throws_ok($$select public.end_program_v1(null, 7, 'bad')$$, '22023', 'PROGRAM_END_INPUT_INVALID', 'missing plan is rejected');
select throws_ok($$select public.end_program_v1('00000000-0000-4000-8000-000000009711', null, 'bad')$$, '22023', 'PROGRAM_END_INPUT_INVALID', 'missing version is rejected');
select throws_ok($$select public.end_program_v1('00000000-0000-4000-8000-000000009711', -1, 'bad')$$, '22023', 'PROGRAM_END_INPUT_INVALID', 'negative version is rejected');
select throws_ok($$select public.end_program_v1('00000000-0000-4000-8000-000000009711', 7, '   ')$$, '22023', 'PROGRAM_END_INPUT_INVALID', 'blank request is rejected');
select throws_ok($$select public.end_program_v1('00000000-0000-4000-8000-000000009711', 7, repeat(' ', 200) || 'a')$$, '22023', 'PROGRAM_END_INPUT_INVALID', 'raw request length is bounded before persistence');
select throws_ok($$select public.end_program_v1('00000000-0000-4000-8000-000000009712', 7, 'foreign')$$, 'PT409', 'PROGRAM_NOT_ACTIVE', 'another owner cannot end a plan');
select throws_ok($$select public.end_program_v1('00000000-0000-4000-8000-000000009711', 6, 'stale')$$, 'PT409', 'PROGRAM_VERSION_CONFLICT', 'stale plan preview fails closed');
select is((select count(*)::integer from public.program_end_receipts where user_id = '00000000-0000-4000-8000-000000009701'), 0, 'rejected calls never create receipts');

-- Start wins the account lock first: End must observe and preserve its active workout.
create temporary table end_fixture(session_id uuid, receipt jsonb, new_program_id uuid, snapshot jsonb);
insert into end_fixture(snapshot) values ('{"id":"end-contract-workout","title":"Saved workout","movements":[{"id":"slot-bench","slotId":"slot-bench","movementId":"bench_press","role":"main","orderIndex":0,"targetSummary":"1 × 5","sets":[{"id":"bench-1","setIndex":1,"targetLoad":80,"targetReps":5}]}]}');
update end_fixture set session_id = public.start_session_v3('end-contract-start', '00000000-0000-4000-8000-000000009711', 'end-contract-workout', current_date, snapshot, 7, null);
select is((select count(*)::integer from public.workout_sessions where id = (select session_id from end_fixture) and status = 'in_progress'), 1, 'Start succeeds before End');
select throws_ok($$select public.end_program_v1('00000000-0000-4000-8000-000000009711', 7, 'active')$$,
  'PT409', 'PROGRAM_END_ACTIVE_WORKOUT', 'active workout belonging to the plan blocks End');
select is((select status from public.program_instances where id = '00000000-0000-4000-8000-000000009711'), 'active', 'blocked End keeps the plan active');
update public.set_logs set actual_load = 80, actual_reps = 5, completed = true
where exercise_log_id in (select id from public.exercise_logs where session_id = (select session_id from end_fixture));

-- Finish wins next: stale End cannot ignore the revision or silently supersede its decision.
select lives_ok($$select public.finish_session_v3(session_id, 'end-contract-finish', 'Keep these notes', 7, 'Solid sets', null, '[]',
  '[{"movementId":"bench_press","ruleId":"simple_linear_completion","scope":"session","inputSummary":"Five reps","recommendation":"Review this workout"}]', 7, 0)
  from end_fixture$$, 'Finish completes before End and records pending progression');
select is((select state_version from public.program_instances where id = '00000000-0000-4000-8000-000000009711'), 8, 'Finish advances the version once');
select throws_ok($$select public.end_program_v1('00000000-0000-4000-8000-000000009711', 7, 'finish-race')$$,
  'PT409', 'PROGRAM_VERSION_CONFLICT', 'Finish invalidates the earlier End preview');
select throws_ok($$select public.end_program_v1('00000000-0000-4000-8000-000000009711', 8, 'pending')$$,
  'PT409', 'PROGRAM_END_PENDING_REVIEW', 'pending progression requires explicit review');
select is((select status from public.progression_decisions where session_id = (select session_id from end_fixture)), 'pending', 'End neither applies nor supersedes the pending decision');
select lives_ok($$select public.resolve_progression_decisions_v2(
  array(select id from public.progression_decisions where session_id = (select session_id from end_fixture)), 'dismissed', 'end-contract-keep')$$,
  'explicit Keep resolves progression before ending');
select is((select state_version from public.program_instances where id = '00000000-0000-4000-8000-000000009711'), 9, 'review invalidates prior plan versions');

insert into public.program_return_periods(user_id, program_instance_id, status, settings)
values ('00000000-0000-4000-8000-000000009701', '00000000-0000-4000-8000-000000009711', 'review',
  '{"stages":[{"workouts":1,"setFraction":0.5,"setCounts":{}}],"minimumRir":3,"defaultCap":2.5,"caps":{}}');
insert into public.workout_sessions(id, user_id, program_instance_id, planned_session_id, status, prescription_snapshot)
values ('00000000-0000-4000-8000-000000009721', '00000000-0000-4000-8000-000000009701', null, null, 'in_progress', '{"id":"unrelated-blank","kind":"ad_hoc","movements":[]}');
update end_fixture set receipt = public.end_program_v1('00000000-0000-4000-8000-000000009711', 9, 'end-contract-accepted');
select is((select status from public.program_instances where id = '00000000-0000-4000-8000-000000009711'), 'completed', 'manual end persists the terminal programme status');
select is((select end_reason from public.program_instances where id = '00000000-0000-4000-8000-000000009711'), 'manual', 'manual ending does not claim automatic programme completion');
select is((select state_version from public.program_instances where id = '00000000-0000-4000-8000-000000009711'), 10, 'End increments the version exactly once');
select is((select current_week_index from public.program_instances where id = '00000000-0000-4000-8000-000000009711'), 4, 'End leaves the completed workout cursor intact');
select is((select ended_at from public.program_instances where id = '00000000-0000-4000-8000-000000009711'),
  (select (receipt->>'endedAt')::timestamptz from end_fixture), 'response returns the authoritative saved end time');
select is((select status from public.workout_sessions where id = '00000000-0000-4000-8000-000000009721'), 'in_progress', 'unrelated ad-hoc workout is untouched');
select is((select state_version from public.workout_sessions where id = '00000000-0000-4000-8000-000000009721'), 0, 'unrelated ad-hoc workout retains its revision');
select is((select status from public.program_return_periods where program_instance_id = '00000000-0000-4000-8000-000000009711'), 'cancelled', 'existing status trigger cancels a return guide awaiting review');
select ok((select ended_at is not null from public.program_return_periods where program_instance_id = '00000000-0000-4000-8000-000000009711'), 'cancelled return guide retains its end time');
select is((select value from public.program_state_values where program_instance_id = '00000000-0000-4000-8000-000000009711'), 100::numeric, 'final programme state values remain unchanged');
select is((select notes from public.workout_sessions where id = (select session_id from end_fixture)), 'Keep these notes', 'saved workout reflection survives ending');
select is((select prescription_snapshot from public.workout_sessions where id = (select session_id from end_fixture)), (select snapshot from end_fixture), 'saved prescription is preserved byte-for-byte as JSON');
select is((select sum(actual_load * actual_reps) from public.set_logs where exercise_log_id in
  (select id from public.exercise_logs where session_id = (select session_id from end_fixture))), 400::numeric, 'completed actual work remains in history');
select is((select status from public.progression_decisions where session_id = (select session_id from end_fixture)), 'dismissed', 'explicit Keep remains in the original receipt');


-- Lost response retries replay the saved receipt, even though the programme is now terminal.
select is(public.end_program_v1('00000000-0000-4000-8000-000000009711', 9, 'end-contract-accepted'),
  (select receipt from end_fixture), 'an exact retry returns the same receipt and timestamp');
select is((select count(*)::integer from public.program_end_receipts where user_id = '00000000-0000-4000-8000-000000009701'), 1, 'exact retries do not duplicate receipts');
select is((select state_version from public.program_instances where id = '00000000-0000-4000-8000-000000009711'), 10, 'exact retries do not increment version twice');
select throws_ok($$select public.end_program_v1('00000000-0000-4000-8000-000000009711', 10, 'end-contract-accepted')$$,
  'PT409', 'IDEMPOTENCY_KEY_REUSED', 'a changed expected version is a different intent');
select throws_ok($$select public.end_program_v1('00000000-0000-4000-8000-000000009712', 9, 'end-contract-accepted')$$,
  'PT409', 'IDEMPOTENCY_KEY_REUSED', 'a changed plan cannot reuse the request');
select throws_ok($$select public.end_program_v1('00000000-0000-4000-8000-000000009711', 10, 'end-again')$$,
  'PT409', 'PROGRAM_NOT_ACTIVE', 'a new intent cannot end an already ended programme');

-- End wins before a later Start: first finish the unrelated blank, then confirm no restart is possible.
select lives_ok($$select public.finish_session_v3('00000000-0000-4000-8000-000000009721', 'blank-finish', null, null, null, null, '[]', '[]', null, 0)$$,
  'the unrelated blank remains independently finishable');
select throws_ok($$select public.start_session_v3('start-after-end', '00000000-0000-4000-8000-000000009711', 'end-contract-workout', current_date, snapshot, 10, null) from end_fixture$$,
  'P0001', 'PROGRAM_NOT_ACTIVE', 'ended plan cannot start a new workout');
select lives_ok($$select public.finish_session_v3(session_id, 'end-contract-finish', 'Keep these notes', 7, 'Solid sets', null, '[]', '[]', null, 0) from end_fixture$$,
  'lost Finish response still replays after End without recreating progression');
select is((select count(*)::integer from public.progression_decisions where session_id = (select session_id from end_fixture)), 1, 'Finish retry preserves the existing single decision');

update end_fixture set new_program_id = public.start_program_v3('new-plan-after-end', version.template_id, version.id,
  version.definition_checksum, 'Next plan', current_date, 'kg', 2.5, null, '[]', '[]', '[]', false, 'standard', null, null, '[]')
from (select * from public.program_template_versions where template_id = 'generic_alternating_5x5_lp' order by created_at desc limit 1) version;
select is((select status from public.program_instances where id = (select new_program_id from end_fixture)), 'active', 'normal setup creates a new plan after ending');
select is((select count(*)::integer from public.program_instances where user_id = '00000000-0000-4000-8000-000000009701' and status = 'active'), 1, 'there is exactly one active replacement plan');
select is(public.end_program_v1('00000000-0000-4000-8000-000000009711', 9, 'end-contract-accepted'),
  (select receipt from end_fixture), 'receipt replay remains stable after a new plan is started');
select is((select status from public.program_instances where id = (select new_program_id from end_fixture)), 'active', 'old End retry does not touch the new plan');

-- Account ownership applies to reads, replay and deletion.
set local role authenticated;
select is((select count(*)::integer from public.program_end_receipts), 1, 'owner can read their saved end receipt');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000009702', true);
select is((select count(*)::integer from public.program_end_receipts), 0, 'RLS hides another account end receipts');
select throws_ok($$select public.end_program_v1('00000000-0000-4000-8000-000000009711', 9, 'end-contract-accepted')$$,
  'PT409', 'PROGRAM_NOT_ACTIVE', 'another account cannot replay the receipt');
reset role;
-- Identical request IDs in different accounts are independent, including open-guide cancellation.
insert into public.program_return_periods(user_id, program_instance_id, status, settings)
values ('00000000-0000-4000-8000-000000009702', '00000000-0000-4000-8000-000000009712', 'active',
  '{"stages":[{"workouts":1,"setFraction":0.5,"setCounts":{}}],"minimumRir":3,"defaultCap":2.5,"caps":{}}');
select lives_ok($$select public.end_program_v1('00000000-0000-4000-8000-000000009712', 7, 'end-contract-accepted')$$,
  'the same request ID is independent for another account');
select ok(exists(select 1 from pg_locks where locktype = 'advisory' and pid = pg_backend_pid() and granted
  and classid = ((hashtextextended('00000000-0000-4000-8000-000000009702', 0) >> 32) & 4294967295)::oid
  and objid = (hashtextextended('00000000-0000-4000-8000-000000009702', 0) & 4294967295)::oid and objsubid = 1),
  'End holds the same transaction-scoped account lock used by Start and Finish');
select is((select status from public.program_return_periods where program_instance_id = '00000000-0000-4000-8000-000000009712'), 'cancelled', 'active return guides also cancel');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000009701', true);
select lives_ok($$select public.delete_own_account('DELETE MY ACCOUNT')$$, 'normal account deletion accepts ended-plan history and receipts');
select is((select count(*)::integer from public.program_end_receipts where user_id = '00000000-0000-4000-8000-000000009701'), 0, 'account deletion removes its durable end receipts');
select is((select count(*)::integer from public.program_instances where user_id = '00000000-0000-4000-8000-000000009701'), 0, 'account deletion removes ended and new plans');
select is((select count(*)::integer from public.program_end_receipts where user_id = '00000000-0000-4000-8000-000000009702'), 1, 'account deletion preserves another account receipts');
select * from finish();
rollback;
