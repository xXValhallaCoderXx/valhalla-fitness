begin;
select no_plan();

create function pg_temp.start_reviewed(request_id text, intent jsonb) returns jsonb language sql as $fn$
  select public.start_program_v4(request_id, intent, auth.uid());
$fn$;
create function pg_temp.review_state() returns jsonb language sql as $fn$
  select public.get_program_start_review_v1(auth.uid());
$fn$;


select has_table('public'::name, 'program_start_receipts'::name);
select ok(not has_function_privilege('anon', 'public.start_program_v4(text,jsonb,uuid)', 'EXECUTE'), 'anonymous callers cannot start reviewed plans');
select ok(not has_function_privilege('anon', 'public.get_program_start_review_v1(uuid)', 'EXECUTE'), 'anonymous callers cannot read account review');
select ok(has_function_privilege('authenticated', 'public.start_program_v3(text,text,uuid,text,text,date,text,numeric,text,jsonb,jsonb,jsonb,boolean,text,uuid,text,jsonb)', 'EXECUTE'), 'legacy v3 remains available');
select ok(not has_function_privilege('authenticated', 'public.start_program_v4(text,jsonb)', 'EXECUTE'), 'unbound start implementation is private');
select ok(not has_function_privilege('authenticated', 'public.get_program_start_review_v1()', 'EXECUTE'), 'unbound review implementation is private');
select ok(not has_table_privilege('authenticated', 'public.program_start_receipts', 'INSERT'), 'receipts cannot be forged');
select ok(not has_table_privilege('authenticated', 'public.program_start_receipts', 'UPDATE'), 'receipts cannot be edited');
select ok(not has_table_privilege('authenticated', 'public.program_start_receipts', 'DELETE'), 'receipts cannot be removed directly');

insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000009801','reviewed-one@example.test'),
 ('00000000-0000-4000-8000-000000009802','reviewed-two@example.test');
insert into public.profiles(id,email) values
 ('00000000-0000-4000-8000-000000009801','reviewed-one@example.test'),
 ('00000000-0000-4000-8000-000000009802','reviewed-two@example.test');
create temporary table start_fixture(intent jsonb, replacement jsonb, receipt jsonb, second_receipt jsonb, session_id uuid, legacy_id uuid);
insert into start_fixture(intent)
select jsonb_build_object('version',1,'templateId',template_id,'templateVersionId',id,'definitionChecksum',definition_checksum,
 'title','Reviewed setup contract','startDate',to_char(current_date,'YYYY-MM-DD'),'units','lb','rounding',5,
 'currentBlockId',definition#>>'{weeks,0,phaseKey}',
 'stateValues',(select coalesce(jsonb_agg(value || '{"value":135,"unit":"lb"}'::jsonb),'[]') from jsonb_array_elements(definition->'requiredState')),
 'movementOverrides','[]'::jsonb,'accessoryAdditions','[]'::jsonb,'equipmentMode','standard',
 'freeWeightPolicyVersionId',null,'freeWeightPolicyChecksum',null,'freeWeightChoices','[]'::jsonb,'expectedActiveProgram',null)
from public.program_template_versions where template_id='generic_alternating_5x5_lp' order by created_at desc,id desc limit 1;

select set_config('request.jwt.claim.sub','',true);
select throws_ok($$select pg_temp.review_state()$$,'42501','AUTH_REQUIRED','review requires identity');
select throws_ok($$select pg_temp.start_reviewed('first',intent) from start_fixture$$,'42501','AUTH_REQUIRED','start requires identity');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009801',true);
select is(pg_temp.review_state(),'{"activeProgram":null,"activeSessionId":null,"pendingDecisionIds":[]}'::jsonb,'fresh account review is explicit');
select throws_ok($$select public.start_program_v4('auth-switch',intent,'00000000-0000-4000-8000-000000009802') from start_fixture$$,'42501','PROGRAM_START_ACCOUNT_CHANGED','auth switch cannot start a first plan for the wrong account');
select throws_ok($$select public.get_program_start_review_v1('00000000-0000-4000-8000-000000009802')$$,'42501','PROGRAM_START_ACCOUNT_CHANGED','auth switch cannot expose another account review');
select throws_ok($$select public.start_program_v4('auth-switch',intent,null) from start_fixture$$,'42501','PROGRAM_START_ACCOUNT_CHANGED','missing expected account fails closed');

select throws_ok($$select pg_temp.start_reviewed('',intent) from start_fixture$$,'22023','PROGRAM_START_INPUT_INVALID','empty request rejected');
select throws_ok($$select pg_temp.start_reviewed('invalid',null)$$,'22023','PROGRAM_START_INPUT_INVALID','missing intent rejected');
select throws_ok($$select pg_temp.start_reviewed('invalid',intent-'expectedActiveProgram') from start_fixture$$,'22023','PROGRAM_START_INPUT_INVALID','absence of active plan must be explicitly reviewed');
select throws_ok($$select pg_temp.start_reviewed('invalid',intent || '{"surprise":true}') from start_fixture$$,'22023','PROGRAM_START_INPUT_INVALID','unknown intent fields rejected');
select throws_ok($$select pg_temp.start_reviewed('invalid',jsonb_set(intent,'{rounding}','0')) from start_fixture$$,'22023','PROGRAM_START_INPUT_INVALID','zero rounding rejected');
select throws_ok($$select pg_temp.start_reviewed('invalid',jsonb_set(intent,'{expectedActiveProgram}','{"id":"00000000-0000-4000-8000-000000009811","stateVersion":0,"extra":true}')) from start_fixture$$,'22023','PROGRAM_START_INPUT_INVALID','unexpected nested review fields are rejected');
select throws_ok($$select pg_temp.start_reviewed('invalid',jsonb_set(intent,'{expectedActiveProgram}','{"id":"00000000-0000-4000-8000-000000009811","stateVersion":-1}')) from start_fixture$$,'22023','PROGRAM_START_INPUT_INVALID','negative review version is rejected');
select throws_ok($$select pg_temp.start_reviewed('invalid',jsonb_set(intent,'{startDate}','"2026-02-31"')) from start_fixture$$,'22023','PROGRAM_START_INPUT_INVALID','impossible date rejected');
select throws_ok($$select pg_temp.start_reviewed('invalid',jsonb_set(intent,'{stateValues}','[]')) from start_fixture$$,'22023','PROGRAM_START_STATE_INVALID','all required state is necessary');
select throws_ok($$select pg_temp.start_reviewed('invalid',jsonb_set(intent,'{stateValues,0,unit}','"kg"')) from start_fixture$$,'22023','PROGRAM_START_STATE_INVALID','state units must match the plan');
select throws_ok($$select pg_temp.start_reviewed('invalid',jsonb_set(intent,'{stateValues,0,value}','0')) from start_fixture$$,'22023','PROGRAM_START_STATE_INVALID','starting values must be positive');
select throws_ok($$select pg_temp.start_reviewed('invalid',jsonb_set(intent,'{stateValues,0,movementId}','"wrong"')) from start_fixture$$,'22023','PROGRAM_START_STATE_INVALID','state cannot relabel a movement');
select throws_ok($$select pg_temp.start_reviewed('invalid',jsonb_set(intent,'{definitionChecksum}','"00000000000000000000000000000000"')) from start_fixture$$,'PT409','PROGRAM_START_TEMPLATE_STALE','review pins exact template contents');
select throws_ok($$select pg_temp.start_reviewed('invalid',intent || '{"equipmentMode":"free_weight","freeWeightPolicyVersionId":"00000000-0000-4000-8000-000000009899","freeWeightPolicyChecksum":"00000000000000000000000000000000"}'::jsonb) from start_fixture$$,'PT409','FREE_WEIGHT_POLICY_STALE','free-weight mode pins current policy identity and checksum');
select is((select count(*)::integer from public.program_start_receipts where user_id='00000000-0000-4000-8000-000000009801'),0,'failed starts persist no receipts');

update start_fixture set receipt=pg_temp.start_reviewed('first',intent);
select is((select receipt->>'requestId' from start_fixture),'first','receipt identifies the request');
select is((select receipt->>'templateVersionId' from start_fixture),(select intent->>'templateVersionId' from start_fixture),'receipt identifies the reviewed definition');
select is((select count(*)::integer from public.program_instances where user_id='00000000-0000-4000-8000-000000009801' and status='active'),1,'first start creates exactly one active plan');
select is((select units from public.program_instances where id=(select (receipt->>'programId')::uuid from start_fixture)),'lb','programme-specific units are saved');
select is((select rounding from public.program_instances where id=(select (receipt->>'programId')::uuid from start_fixture)),5::numeric,'programme-specific rounding is saved');
select is((select units from public.profiles where id='00000000-0000-4000-8000-000000009801'),'kg','profile units are untouched');
select is((select pg_temp.start_reviewed('first',intent) from start_fixture),(select receipt from start_fixture),'same intent returns exact receipt');
select throws_ok($$select pg_temp.start_reviewed('first',jsonb_set(intent,'{startDate}','"2026-01-01"')) from start_fixture$$,'PT409','IDEMPOTENCY_KEY_REUSED','start date remains part of exact intent across midnight retries');
select throws_ok($$select pg_temp.start_reviewed('first',jsonb_set(intent,'{equipmentMode}','"free_weight"')) from start_fixture$$,'PT409','IDEMPOTENCY_KEY_REUSED','equipment-only request changes cannot reinterpret an old start');
select throws_ok($$select pg_temp.start_reviewed('first',jsonb_set(intent,'{rounding}','2.5')) from start_fixture$$,'PT409','IDEMPOTENCY_KEY_REUSED','reusing a key with changed rounding is rejected');
select throws_ok($$select pg_temp.start_reviewed('first',jsonb_set(intent,'{stateValues,0,value}','140')) from start_fixture$$,'PT409','IDEMPOTENCY_KEY_REUSED','reusing a key with changed values is rejected');
select throws_ok($$select pg_temp.start_reviewed('second',intent) from start_fixture$$,'PT409','PROGRAM_START_REVIEW_STALE','another active plan invalidates no-plan consent');
select is(pg_temp.review_state()#>>'{activeProgram,id}',(select receipt->>'programId' from start_fixture),'review returns the actual plan identity');
update start_fixture set replacement=jsonb_set(intent,'{expectedActiveProgram}',jsonb_build_object('id',receipt->>'programId','stateVersion',0));

-- Start wins the lifecycle lock first; guarded replacement cannot discard its saved work.
update start_fixture set session_id=public.start_session_v3('reviewed-workout',(receipt->>'programId')::uuid,'reviewed-session',current_date,
 '{"id":"reviewed-session","title":"Saved workout","movements":[{"id":"slot-bench","slotId":"slot-bench","movementId":"bench_press","role":"main","orderIndex":0,"targetSummary":"1 x 5","sets":[{"id":"bench-1","setIndex":1,"targetLoad":80,"targetReps":5}]}]}',0,null);
select is(pg_temp.review_state()->>'activeSessionId',(select session_id::text from start_fixture),'review names the blocking workout');
select throws_ok($$select pg_temp.start_reviewed('blocked',replacement) from start_fixture$$,'PT409','PROGRAM_START_ACTIVE_WORKOUT','active workout blocks replacement atomically');
select is((select status from public.workout_sessions where id=(select session_id from start_fixture)),'in_progress','blocked replacement preserves the workout');
update public.set_logs set actual_load=80,actual_reps=5,completed=true where exercise_log_id in
 (select id from public.exercise_logs where session_id=(select session_id from start_fixture));
select lives_ok($$select public.finish_session_v3(session_id,'reviewed-finish','Saved notes',7,null,null,'[]',
 '[{"movementId":"bench_press","ruleId":"simple_linear_completion","scope":"session","inputSummary":"Five reps","recommendation":"Review this workout"}]',0,0)
 from start_fixture$$,'Finish commits and creates progression');
select throws_ok($$select pg_temp.start_reviewed('finish-race',replacement) from start_fixture$$,'PT409','PROGRAM_START_REVIEW_STALE','Finish invalidates old plan version consent');
update start_fixture set replacement=jsonb_set(replacement,'{expectedActiveProgram,stateVersion}','1');
select throws_ok($$select pg_temp.start_reviewed('pending',replacement) from start_fixture$$,'PT409','PROGRAM_START_PENDING_REVIEW','pending progression blocks even a refreshed plan version');
select is(jsonb_array_length(pg_temp.review_state()->'pendingDecisionIds'),1,'review names every pending decision');
select is((select status from public.progression_decisions where session_id=(select session_id from start_fixture)),'pending','replacement does not silently supersede progression');
select lives_ok($$select public.resolve_progression_decisions_v2(array(select id from public.progression_decisions where session_id=(select session_id from start_fixture)), 'dismissed','reviewed-keep')$$,'explicit Keep resolves the decision');
select throws_ok($$select pg_temp.start_reviewed('keep-race',replacement) from start_fixture$$,'PT409','PROGRAM_START_REVIEW_STALE','Keep requires a fresh review');
update start_fixture set replacement=jsonb_set(replacement,'{expectedActiveProgram,stateVersion}','2');
insert into public.program_return_periods(user_id,program_instance_id,status,settings)
select '00000000-0000-4000-8000-000000009801',(receipt->>'programId')::uuid,'review',
 '{"stages":[{"workouts":1,"setFraction":0.5,"setCounts":{}}],"minimumRir":3,"defaultCap":2.5,"caps":{}}'::jsonb from start_fixture;
update start_fixture set second_receipt=pg_temp.start_reviewed('second',replacement);
select is((select status from public.program_instances where id=(select (receipt->>'programId')::uuid from start_fixture)),'archived','explicit reviewed replacement archives only the resolved plan');
select is((select status from public.program_return_periods where program_instance_id=(select (receipt->>'programId')::uuid from start_fixture)),'cancelled','replacement preserves the existing return-guide lifecycle trigger');
select is((select notes from public.workout_sessions where id=(select session_id from start_fixture)),'Saved notes','completed workout history survives replacement');
select is((select pg_temp.start_reviewed('first',intent) from start_fixture),(select receipt from start_fixture),'old replay returns its own receipt after replacement');
select is(pg_temp.review_state()#>>'{activeProgram,id}',(select second_receipt->>'programId' from start_fixture),'old replay never returns or changes the current plan');
insert into public.progression_decisions(id,user_id,program_instance_id,movement_id,rule_id,scope,input_summary,recommendation)
select '00000000-0000-4000-8000-000000009831','00000000-0000-4000-8000-000000009801',(receipt->>'programId')::uuid,
 'bench_press','simple_linear_completion','session','Older unresolved work','Review before replacement' from start_fixture;
select throws_ok($$select pg_temp.start_reviewed('older-pending',jsonb_set(intent,'{expectedActiveProgram}',jsonb_build_object('id',second_receipt->>'programId','stateVersion',0))) from start_fixture$$,
 'PT409','PROGRAM_START_PENDING_REVIEW','pending work on an earlier plan also blocks account-wide replacement');
delete from public.progression_decisions where id='00000000-0000-4000-8000-000000009831';

update public.program_templates set is_active=false where id='generic_alternating_5x5_lp';
select is((select pg_temp.start_reviewed('second',replacement) from start_fixture),(select second_receipt from start_fixture),'receipt survives template becoming unavailable');
update public.program_templates set is_active=true where id='generic_alternating_5x5_lp';
select lives_ok($$select public.end_program_v1((second_receipt->>'programId')::uuid,0,'end-reviewed') from start_fixture$$,'End is compatible with a reviewed plan');
select is((select pg_temp.start_reviewed('second',replacement) from start_fixture),(select second_receipt from start_fixture),'receipt survives later End');
insert into public.workout_sessions(id,user_id,status,prescription_snapshot)
values ('00000000-0000-4000-8000-000000009821','00000000-0000-4000-8000-000000009801','in_progress','{"kind":"ad_hoc","movements":[]}');
select throws_ok($$select pg_temp.start_reviewed('blank-block',intent) from start_fixture$$,'PT409','PROGRAM_START_ACTIVE_WORKOUT','unrelated ad-hoc workout also blocks initial setup');
delete from public.workout_sessions where id='00000000-0000-4000-8000-000000009821';
update start_fixture set legacy_id=public.start_program_v3('legacy',intent->>'templateId',(intent->>'templateVersionId')::uuid,
 intent->>'definitionChecksum','Legacy still works',current_date,'kg',2.5,null,'[]','[]','[]',false,'standard',null,null,'[]');
select throws_ok($$select pg_temp.start_reviewed('legacy',intent) from start_fixture$$,'PT409','IDEMPOTENCY_KEY_REUSED','v4 never adopts an unverifiable legacy replay');
select ok(exists(select 1 from pg_locks where locktype='advisory' and pid=pg_backend_pid() and granted
 and classid=((hashtextextended('00000000-0000-4000-8000-000000009801',0)>>32)&4294967295)::oid
 and objid=(hashtextextended('00000000-0000-4000-8000-000000009801',0)&4294967295)::oid and objsubid=1),
 'reviewed start holds the same account lock as competing lifecycle operations');

set local role authenticated;
select is((select count(*)::integer from public.program_start_receipts),2,'owner can read its receipts');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009802',true);
select is((select count(*)::integer from public.program_start_receipts),0,'RLS hides foreign receipts');
select is(pg_temp.review_state(),'{"activeProgram":null,"activeSessionId":null,"pendingDecisionIds":[]}'::jsonb,'review contains no other account data');
reset role;
select throws_ok($$select pg_temp.start_reviewed('foreign-plan',replacement) from start_fixture$$,'PT409','PROGRAM_START_REVIEW_STALE','foreign expected plan is never replaced');
select lives_ok($$select pg_temp.start_reviewed('first',intent) from start_fixture$$,'the same key is independent for another account');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009801',true);
select lives_ok($$select public.delete_own_account('DELETE MY ACCOUNT')$$,'account deletion supports reviewed starts');
select is((select count(*)::integer from public.program_start_receipts where user_id='00000000-0000-4000-8000-000000009801'),0,'account deletion cascades receipts');
select is((select count(*)::integer from public.program_start_receipts where user_id='00000000-0000-4000-8000-000000009802'),1,'account deletion preserves foreign receipts');
select * from finish();
rollback;
