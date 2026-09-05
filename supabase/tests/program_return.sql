begin;
select no_plan();
select has_table('public'::name,'program_return_periods'::name);
select has_table('public'::name,'program_load_overrides'::name);
select has_table('public'::name,'program_load_adjustments'::name);
select ok(not has_table_privilege('authenticated','public.program_return_periods','INSERT'),'guides require the transactional boundary');
select ok(not has_table_privilege('authenticated','public.program_load_overrides','UPDATE'),'fixed overrides require the transactional boundary');
select ok(not has_table_privilege('authenticated','public.program_load_adjustments','UPDATE'),'adjustment ledger is append-only to clients');
select ok(not has_function_privilege('authenticated','public.start_session_before_return(text,uuid,text,date,jsonb,integer,uuid)','EXECUTE'),'legacy implementation cannot bypass the start handshake');
select ok(not has_function_privilege('authenticated','public.finish_session_before_return(uuid,text,text,integer,text,text,jsonb,jsonb,integer,integer)','EXECUTE'),'legacy implementation cannot bypass return finish validation');
select ok(not has_function_privilege('anon','public.change_program_return_v1(uuid,integer,text,text,jsonb,jsonb,uuid[])','EXECUTE'),'anonymous callers cannot reset loads');

insert into auth.users(id,email) values('00000000-0000-4000-8000-000000009601','return-contract@example.test');
insert into public.profiles(id,email) values('00000000-0000-4000-8000-000000009601','return-contract@example.test');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009601',true);
insert into public.program_instances(id,user_id,template_id,template_version_id,title,status,start_date,units,rounding,current_week_index,state_version)
select '00000000-0000-4000-8000-000000009602','00000000-0000-4000-8000-000000009601',template_id,id,'Return contract','active',current_date,'kg',2.5,0,0
from public.program_template_versions where template_id = 'generic_alternating_5x5_lp' order by created_at desc limit 1;
insert into public.program_state_values(user_id,program_instance_id,key,movement_id,state_type,value,unit)
select '00000000-0000-4000-8000-000000009601','00000000-0000-4000-8000-000000009602',state->>'key',state->>'movementId',state->>'type',100,'kg'
from public.program_instances program join public.program_template_versions version on version.id=program.template_version_id cross join lateral jsonb_array_elements(version.definition->'requiredState') state where program.id='00000000-0000-4000-8000-000000009602';
create temporary table return_fixture(settings jsonb, changes jsonb, snapshot jsonb, session_id uuid);
insert into return_fixture(settings,changes)
select '{"stages":[{"workouts":1,"setFraction":0.5,"setCounts":{}}],"minimumRir":3,"defaultCap":2.5,"caps":{}}', jsonb_agg(value || jsonb_build_object('after',80)) from jsonb_each(public.program_return_load_sources_v1('00000000-0000-4000-8000-000000009602'));
select lives_ok($$select public.change_program_return_v1('00000000-0000-4000-8000-000000009602',0,'return-reset','apply',settings,changes,'{}') from return_fixture$$,'reset applies atomically');
select lives_ok($$select public.change_program_return_v1('00000000-0000-4000-8000-000000009602',0,'return-reset','apply',settings,changes,'{}') from return_fixture$$,'exact reset retry succeeds');
select is((select count(*)::integer from public.program_load_adjustments where program_instance_id='00000000-0000-4000-8000-000000009602'),1,'one immutable receipt for an exact retry');
select ok((select bool_and(value=80) from public.program_state_values where program_instance_id='00000000-0000-4000-8000-000000009602'),'loads reduced only once');
select throws_ok($$select public.change_program_return_v1('00000000-0000-4000-8000-000000009602',0,'new-stale-request','apply',settings,changes,'{}') from return_fixture$$,'PT409','CONFLICT: refresh the return preview','stale preview fails without retrying a serialization transaction');
select throws_ok($$select public.change_program_return_v1('00000000-0000-4000-8000-000000009602',0,'return-reset','end',settings,'[]','{}') from return_fixture$$,'PT409','IDEMPOTENCY_CONFLICT','same token with changed intent is rejected');
select throws_ok($$update public.program_load_adjustments set changes='[]' where program_instance_id='00000000-0000-4000-8000-000000009602'$$,'P0001','LOAD_ADJUSTMENT_LEDGER_IMMUTABLE','ledger cannot be rewritten');
select throws_ok($$select public.start_session_v2('old-client','00000000-0000-4000-8000-000000009602','day',current_date,'{}',1,null)$$,'P0001','RETURN_CLIENT_UPDATE_REQUIRED: update the app to start this workout','old clients fail clearly');

-- Construct a canonical snapshot from durable sources, then attempt mutations of it.
with source as (
  select public.program_return_targets_v1(program_instance_id,settings->'stages'->0,3) as slots, period.*
  from public.program_return_periods period where program_instance_id='00000000-0000-4000-8000-000000009602'
), expanded as (
 select source.*,version.definition,version.definition->'sessions'->0 as template_session
 from source join public.program_instances program on program.id=source.program_instance_id join public.program_template_versions version on version.id=program.template_version_id
)
update return_fixture set snapshot = jsonb_build_object(
 'id',(expanded.template_session->>'id')||'-w1','templateSessionId',expanded.template_session->>'id','templateId',expanded.definition->>'id','title','Return contract','units','kg','rounding',2.5,'weekIndex',0,'scheduledDate',current_date,
 'movements',(select jsonb_agg(jsonb_build_object('id',key,'slotId',key,'phaseKey',expanded.definition #>> '{weeks,0,phaseKey}','movementId',value->'movementId','role',value->'role','progressionRuleId',value->'progressionRuleId','orderIndex',ordinality,'targetSummary','Return work','sets',value->'targets')) from jsonb_each(expanded.slots) with ordinality),
 'returnContext',jsonb_build_object('policyVersion',1,'periodId',expanded.id,'startedAt',expanded.started_at,'completedWorkouts',0,'stageIndex',0,'stageWorkout',1,'stageWorkouts',1,'review',false,'minimumRir',3,'defaultCap',2.5,'caps','{}'::jsonb,'slots',(select jsonb_object_agg(key,value-'role') from jsonb_each(expanded.slots)))
) from expanded;
select lives_ok($$select public.validate_return_start_v1('00000000-0000-4000-8000-000000009602',snapshot) from return_fixture$$,'database derives and accepts adjusted targets');
select throws_ok($$select public.validate_return_start_v1('00000000-0000-4000-8000-000000009602',jsonb_set(snapshot,'{movements,0,sets,0,targetLoad}','100')) from return_fixture$$,'P0001','RETURN_TARGETS_INVALID','forged heavier targets are rejected');
select throws_ok($$select public.validate_return_start_v1('00000000-0000-4000-8000-000000009602',jsonb_set(snapshot,'{returnContext,defaultCap}','100')) from return_fixture$$,'P0001','RETURN_CLIENT_UPDATE_REQUIRED: refresh the return guide','forged progression cap is rejected');
update return_fixture set session_id=public.start_session_v3('return-start','00000000-0000-4000-8000-000000009602',snapshot->>'id',current_date,snapshot,1,null);
select is((select count(*)::integer from public.workout_sessions where program_instance_id='00000000-0000-4000-8000-000000009602'),1,'adjusted workout is persisted');
select throws_ok($$select public.change_program_return_v1('00000000-0000-4000-8000-000000009602',1,'active-edit','end',settings,'[]','{}') from return_fixture$$,'P0001','Finish or discard the current workout before editing the return guide.','settings cannot change under an active workout');
select throws_ok($$update public.workout_sessions set prescription_snapshot=prescription_snapshot-'returnContext' where id=(select session_id from return_fixture)$$,'P0001','RETURN_CONTEXT_IMMUTABLE','structural changes cannot strip return provenance');
select throws_ok($$select public.finish_session_v2(session_id,'old-finish',null,null,null,null,'[]','[]',1,0) from return_fixture$$,'P0001','RETURN_CLIENT_UPDATE_REQUIRED: update the app to finish this workout','old finish protocol is rejected');
select lives_ok($$select public.finish_session_v3(session_id,'empty-finish',null,null,null,null,'[]','[]',1,0) from return_fixture$$,'empty workout can finish');
select is((select completed_workouts from public.program_return_periods where program_instance_id='00000000-0000-4000-8000-000000009602'),0,'empty workout does not consume a return step');
select is((select current_week_index from public.program_instances where id='00000000-0000-4000-8000-000000009602'),1,'normal programme cursor advances exactly once');
select lives_ok($$select public.finish_session_v3(session_id,'empty-finish',null,null,null,null,'[]','[]',null,0) from return_fixture$$,'exact finish retry succeeds');
select is((select current_week_index from public.program_instances where id='00000000-0000-4000-8000-000000009602'),1,'finish retry does not advance cursor again');
select lives_ok($$select public.change_program_return_v1('00000000-0000-4000-8000-000000009602',2,'end-guide','end',settings,'[]','{}') from return_fixture$$,'end restores ordinary prescriptions');
select ok((select bool_and(value=80) from public.program_state_values where program_instance_id='00000000-0000-4000-8000-000000009602'),'end preserves reset load values');
select is((select status from public.program_return_periods where program_instance_id='00000000-0000-4000-8000-000000009602'),'completed','end is persistent');

-- A new return discloses and supersedes obsolete decisions and audits existing manual targets.
insert into public.progression_decisions(id,user_id,program_instance_id,movement_id,rule_id,scope,input_summary,recommendation,state_key,state_type,previous_value,recommended_value)
select '00000000-0000-4000-8000-000000009603',user_id,program_instance_id,movement_id,'simple_linear_completion','session','Old work','Increase old reference',key,state_type,value,value+5
from public.program_state_values where program_instance_id='00000000-0000-4000-8000-000000009602' order by key limit 1;
insert into public.program_accessory_additions(id,user_id,program_instance_id,session_id,slot_id,movement_id,prescription_id,order_index,sets)
select '00000000-0000-4000-8000-000000009604',user_id,id,'day-a','return-manual','barbell_row','manual',99,'[{"id":"manual-1","setIndex":1,"targetLoad":50,"targetReps":8}]'
from public.program_instances where id='00000000-0000-4000-8000-000000009602';
update return_fixture set changes=(select jsonb_agg(value || jsonb_build_object('after',case when value->>'kind'='accessory' then 40 else 80 end)) from jsonb_each(public.program_return_load_sources_v1('00000000-0000-4000-8000-000000009602')));
select throws_ok($$select public.change_program_return_v1('00000000-0000-4000-8000-000000009602',3,'undisclosed-decision','apply',settings,changes,'{}') from return_fixture$$,'PT409','CONFLICT: progression decisions changed','undisclosed recommendations block acceptance');
select lives_ok($$select public.change_program_return_v1('00000000-0000-4000-8000-000000009602',3,'disclosed-decision','apply',settings,changes,'{00000000-0000-4000-8000-000000009603}') from return_fixture$$,'accepted preview supersedes the disclosed recommendation');
select is((select status from public.progression_decisions where id='00000000-0000-4000-8000-000000009603'),'superseded','obsolete recommendation cannot later be applied');
select is((select sets #>> '{0,targetLoad}' from public.program_accessory_additions where id='00000000-0000-4000-8000-000000009604'),'40','existing manual accessory target resets once');
select ok((select changes @> '[{"kind":"accessory","before":50,"after":40}]'::jsonb from public.program_load_adjustments where request_id='disclosed-decision'),'ledger records the accessory before and after');
update public.program_instances set status='archived' where id='00000000-0000-4000-8000-000000009602';
select is((select count(*)::integer from public.program_return_periods where program_instance_id='00000000-0000-4000-8000-000000009602' and status='cancelled'),1,'programme replacement cancels its open guide');
select is((select return_recommendations from public.workout_sessions where id=(select session_id from return_fixture)),'[]'::jsonb,'completed summary retains its original finish recommendations');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009699',true);
set local role authenticated;
select is((select count(*)::integer from public.program_return_periods),0,'return records are account-isolated');
select is((select count(*)::integer from public.program_load_adjustments),0,'load audit records are account-isolated');
reset role;
delete from auth.users where id='00000000-0000-4000-8000-000000009601';
select is((select count(*)::integer from public.program_return_periods where user_id='00000000-0000-4000-8000-000000009601'),0,'account deletion cascades return periods');
select is((select count(*)::integer from public.program_load_adjustments where user_id='00000000-0000-4000-8000-000000009601'),0,'account deletion cascades reset receipts');
select * from finish();
rollback;
