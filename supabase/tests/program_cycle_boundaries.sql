begin;
select no_plan();
select has_table('public'::name,'program_cycle_boundaries'::name);
select has_table('public'::name,'program_cycle_repeat_receipts'::name);
select ok(not has_table_privilege('authenticated','public.program_cycle_boundaries','INSERT,UPDATE,DELETE'),'clients cannot forge boundary state');
select ok(not has_table_privilege('authenticated','public.program_cycle_repeat_receipts','INSERT,UPDATE,DELETE'),'clients cannot forge repeat receipts');
select ok(not has_function_privilege('anon','public.repeat_program_cycle_v1(uuid,uuid,integer,text,uuid)','EXECUTE'),'anonymous repeat is denied');
select ok(not has_function_privilege('authenticated','public.start_session_before_cycle(text,uuid,text,date,jsonb,integer,uuid)','EXECUTE'),'old inner session start cannot bypass cycle guard');
select ok(not has_function_privilege('authenticated','public.start_program_before_cycle(text,text,uuid,text,text,date,text,numeric,text,jsonb,jsonb,jsonb,boolean)','EXECUTE'),'old inner replacement cannot bypass cycle guard');
select is(public.program_cycle_policy_v1('healthy-531-fsl'),'review_at_end','structured wave stops');
select is(public.program_cycle_policy_v1('training_max_wave_pump_5day'),'review_at_end','five-day wave stops');
select is(public.program_cycle_policy_v1('bromley-volume-intensity'),'review_at_end','six-week block stops');
select is(public.program_cycle_policy_v1('bromley-bullmastiff'),'review_at_end','18-week block stops');
select is(public.program_cycle_policy_v1('bromley-70s-powerlifter'),'review_at_end','other 18-week block stops');
select is(public.program_cycle_policy_v1('generic_alternating_5x5_lp'),'auto_repeat','A/B rotation continues');
select is(public.program_cycle_policy_v1('beginner_upper_lower_lp'),'auto_repeat','weekly routine continues');
select is(public.program_cycle_policy_v1('custom-18-week'),'auto_repeat','unknown schedules are not inferred by duration');

insert into auth.users(id,email) values ('00000000-0000-4000-8000-000000005801','cycle-one@example.test'),('00000000-0000-4000-8000-000000005802','cycle-two@example.test');
insert into public.profiles(id,email) values ('00000000-0000-4000-8000-000000005801','cycle-one@example.test'),('00000000-0000-4000-8000-000000005802','cycle-two@example.test');
insert into public.program_instances(id,user_id,template_id,template_version_id,title,status,start_date,units,rounding,current_week_index,state_version)
select '00000000-0000-4000-8000-000000005811','00000000-0000-4000-8000-000000005801',template_id,id,'Cycle contract','active',current_date,'kg',2.5,15,7
from public.program_template_versions where template_id = 'healthy-531-fsl' order by created_at desc limit 1;
insert into public.program_state_values(user_id,program_instance_id,key,movement_id,state_type,value,unit)
values('00000000-0000-4000-8000-000000005801','00000000-0000-4000-8000-000000005811','bench_training_max','bench_press','training_max',100,'kg');
select is((select cycle_end_policy from public.program_instances where id='00000000-0000-4000-8000-000000005811'),'review_at_end','new instances persist the server policy');
select is((select count(*)::integer from public.program_cycle_boundaries where user_id='00000000-0000-4000-8000-000000005801'),0,'cursor alone does not backfill a boundary');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000005801',true);
create temporary table cycle_fixture(session_id uuid,boundary_id uuid,receipt jsonb,snapshot jsonb);
insert into cycle_fixture(snapshot) values ('{"id":"cycle-final","weekIndex":15,"units":"kg","title":"Final workout","movements":[{"id":"bench","slotId":"bench","movementId":"bench_press","role":"main","orderIndex":0,"sets":[{"id":"bench-set","setIndex":1,"targetLoad":80,"targetReps":5},{"id":"bench-unlogged","setIndex":2,"targetLoad":80,"targetReps":5}]}]}');
update cycle_fixture set session_id=public.start_session_v3('cycle-start','00000000-0000-4000-8000-000000005811','cycle-final',current_date,snapshot,7,null);
update public.set_logs set actual_load=80,actual_reps=5,completed=true where set_index=1 and exercise_log_id in(select id from public.exercise_logs where session_id=(select session_id from cycle_fixture));
select throws_ok($$select public.finish_session_v3(session_id,'cycle-finish',null,null,null,null,'[]','[]',99,0) from cycle_fixture$$,'40001','CONFLICT','failed Finish cannot create a boundary');
select is((select count(*)::integer from public.program_cycle_boundaries where user_id='00000000-0000-4000-8000-000000005801'),0,'failed Finish is atomic');
select lives_ok($$select public.finish_session_v3(session_id,'cycle-finish',null,null,null,null,'[]','[]',7,0) from cycle_fixture$$,'partial final workout reaches the scheduled boundary');
update cycle_fixture set boundary_id=(select id from public.program_cycle_boundaries where session_id=cycle_fixture.session_id);
select is((select status from public.program_cycle_boundaries where id=(select boundary_id from cycle_fixture)),'pending','Finish records a pending choice');
select is((select current_week_index from public.program_instances where id='00000000-0000-4000-8000-000000005811'),16,'existing Finish advances the cursor once');
select is((select state_version from public.program_instances where id='00000000-0000-4000-8000-000000005811'),8,'Finish increments version once');
select lives_ok($$select public.finish_session_v3(session_id,'cycle-finish',null,null,null,null,'[]','[]',7,0) from cycle_fixture$$,'lost Finish response retries');
select is((select count(*)::integer from public.program_cycle_boundaries where program_instance_id='00000000-0000-4000-8000-000000005811'),1,'Finish retry does not duplicate boundary');
select is(public.start_session_v3('cycle-start','00000000-0000-4000-8000-000000005811','cycle-final',current_date,'{}',0,null),(select session_id from cycle_fixture),'exact Start replay survives boundary');
select throws_ok($$select public.start_session_v3('blocked-next','00000000-0000-4000-8000-000000005811','cycle-final',current_date,snapshot,8,null) from cycle_fixture$$,'PT409','CYCLE_REVIEW_REQUIRED: Your cycle is complete. Open Today or Plan to repeat, replace or end it. Update the app if these choices are unavailable.','new planned start is blocked');
select throws_ok($$select public.start_session_v2('blocked-legacy','00000000-0000-4000-8000-000000005811','cycle-final',current_date,snapshot,8,null) from cycle_fixture$$,'PT409','CYCLE_REVIEW_REQUIRED: Your cycle is complete. Open Today or Plan to repeat, replace or end it. Update the app if these choices are unavailable.','legacy planned start is blocked');
select throws_ok($$select public.start_ad_hoc_session_v2('blocked-blank',current_date,'{"movements":[]}',null)$$,'PT409','CYCLE_REVIEW_REQUIRED: Your cycle is complete. Open Today or Plan to repeat, replace or end it. Update the app if these choices are unavailable.','blank and favourite entry cannot bypass pending choice');
select throws_ok($$update public.program_instances set current_week_index=17 where id='00000000-0000-4000-8000-000000005811'$$,'PT409','CYCLE_REVIEW_REQUIRED: resolve the completed cycle in Today or Plan','read repair cannot skip the boundary');
select throws_ok($$select public.repeat_program_cycle_v1('00000000-0000-4000-8000-000000005811',boundary_id,7,'stale','00000000-0000-4000-8000-000000005801') from cycle_fixture$$,'PT409','CYCLE_VERSION_CONFLICT','stale repeat preview fails closed');
select throws_ok($$select public.repeat_program_cycle_v1('00000000-0000-4000-8000-000000005811',boundary_id,8,'wrong-account','00000000-0000-4000-8000-000000005802') from cycle_fixture$$,'42501','ACCOUNT_CHANGED','intent binds expected account');
insert into public.progression_decisions(user_id,program_instance_id,session_id,movement_id,rule_id,scope,status,input_summary,recommendation,state_key,state_type,previous_value,recommended_value)
select '00000000-0000-4000-8000-000000005801','00000000-0000-4000-8000-000000005811',session_id,'bench_press','training_max_standard','cycle','pending','Saved top set','Review 105','bench_training_max','training_max',100,105 from cycle_fixture;
select throws_ok($$select public.repeat_program_cycle_v1('00000000-0000-4000-8000-000000005811',boundary_id,8,'pending','00000000-0000-4000-8000-000000005801') from cycle_fixture$$,'PT409','CYCLE_PENDING_PROGRESSION','Repeat cannot auto-accept weights');
select throws_ok($$select public.start_program_v2('legacy-replace','healthy-531-fsl',null,'checksum','Replacement',current_date,'kg',2.5,null,'[]','[]','[]',true)$$,'PT409','CYCLE_PENDING_PROGRESSION','legacy replacement cannot silently supersede progression');
select lives_ok($$select public.resolve_progression_decisions_v2(array[id],'accepted','cycle-apply') from public.progression_decisions where program_instance_id='00000000-0000-4000-8000-000000005811'$$,'existing Apply remains usable while the cycle waits');
update cycle_fixture set receipt=public.repeat_program_cycle_v1('00000000-0000-4000-8000-000000005811',boundary_id,(select state_version from public.program_instances where id='00000000-0000-4000-8000-000000005811'),'cycle-repeat','00000000-0000-4000-8000-000000005801');
select is((select status from public.program_cycle_boundaries where id=(select boundary_id from cycle_fixture)),'repeated','confirmation unlocks next cycle');
select is((select current_week_index from public.program_instances where id='00000000-0000-4000-8000-000000005811'),16,'Repeat never advances the cursor again');
select is((select value from public.program_state_values where program_instance_id='00000000-0000-4000-8000-000000005811'),105::numeric,'Repeat preserves accepted weights');
select is((select reviewed_weights->0->>'value' from public.program_cycle_repeat_receipts where request_id='cycle-repeat'),'105','receipt freezes the reviewed reference');
select is((select count(*)::integer from public.workout_sessions where user_id='00000000-0000-4000-8000-000000005801' and status='in_progress'),0,'Repeat does not start logging');
select is(public.repeat_program_cycle_v1('00000000-0000-4000-8000-000000005811',(select boundary_id from cycle_fixture),((select receipt->>'stateVersion' from cycle_fixture)::integer)-1,'cycle-repeat','00000000-0000-4000-8000-000000005801'),(select receipt from cycle_fixture),'lost Repeat response returns exact receipt');
select throws_ok($$select public.repeat_program_cycle_v1('00000000-0000-4000-8000-000000005811',boundary_id,0,'cycle-repeat','00000000-0000-4000-8000-000000005801') from cycle_fixture$$,'PT409','IDEMPOTENCY_KEY_REUSED','changed retry intent fails');
select throws_ok($$select public.repeat_program_cycle_v1('00000000-0000-4000-8000-000000005811',boundary_id,9,'second-repeat','00000000-0000-4000-8000-000000005801') from cycle_fixture$$,'PT409','CYCLE_NO_LONGER_PENDING','second device cannot repeat twice');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000005802',true);
set local role authenticated;
select is((select count(*)::integer from public.program_cycle_boundaries),0,'other account cannot read boundary');
select is((select count(*)::integer from public.program_cycle_repeat_receipts),0,'other account cannot read repeat receipt');
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000005801',true);
-- A later cycle has its own source receipt and can end without deleting an unrelated active blank.
update public.program_instances set current_week_index=31 where id='00000000-0000-4000-8000-000000005811';
update cycle_fixture set snapshot=jsonb_set(jsonb_set(snapshot,'{id}','"cycle-second-final"'),'{weekIndex}','31');
update cycle_fixture set session_id=public.start_session_v3('cycle-second-start','00000000-0000-4000-8000-000000005811','cycle-second-final',current_date,snapshot,(receipt->>'stateVersion')::integer,null);
select is(public.start_session_v3('resume-stale','00000000-0000-4000-8000-000000005811','stale',current_date,'{}',0,null),(select session_id from cycle_fixture),'Resume wins over stale next-workout input');
select lives_ok($$select public.finish_session_v3(session_id,'cycle-second-finish',null,null,null,null,'[]','[]',(receipt->>'stateVersion')::integer,0) from cycle_fixture$$,'legacy empty final completion still preserves authoritative schedule semantics');
update cycle_fixture set boundary_id=(select id from public.program_cycle_boundaries where session_id=cycle_fixture.session_id);
select is((select cycle_number from public.program_cycle_boundaries where id=(select boundary_id from cycle_fixture)),2,'a later cycle receives its own boundary');
select is((select count(*)::integer from public.program_cycle_boundaries where program_instance_id='00000000-0000-4000-8000-000000005811'),2,'earlier cycle receipt remains inspectable');
insert into public.workout_sessions(id,user_id,status,scheduled_date,prescription_snapshot,client_mutation_id)
values('00000000-0000-4000-8000-000000005899','00000000-0000-4000-8000-000000005801','in_progress',current_date,'{"kind":"ad_hoc","movements":[]}','existing-blank');
select is(public.start_ad_hoc_session_v2('resume-existing-blank',current_date,'{"movements":[]}',null),'00000000-0000-4000-8000-000000005899'::uuid,'an existing blank remains resumable while a choice waits');
select throws_ok($$select public.repeat_program_cycle_v1('00000000-0000-4000-8000-000000005811',boundary_id,(receipt->>'stateVersion')::integer+1,'repeat-with-active','00000000-0000-4000-8000-000000005801') from cycle_fixture$$,'PT409','CYCLE_ACTIVE_WORKOUT','Repeat preserves any existing workout');
select lives_ok($$select public.end_program_v1('00000000-0000-4000-8000-000000005811',(receipt->>'stateVersion')::integer+1,'end-pending-cycle') from cycle_fixture$$,'End resolves a pending cycle');
select is((select status from public.program_cycle_boundaries where id=(select boundary_id from cycle_fixture)),'ended','End saves its cycle outcome');
select is((select status from public.workout_sessions where id='00000000-0000-4000-8000-000000005899'),'in_progress','End preserves the unrelated blank');
select lives_ok($$select public.discard_workout_session('00000000-0000-4000-8000-000000005899')$$,'existing explicit discard remains usable');
select lives_ok($$select public.start_ad_hoc_session_v2('blank-after-end',current_date,'{"movements":[]}',null)$$,'blank entry unlocks after explicit End');
select is((select count(*)::integer from public.set_logs where completed and user_id='00000000-0000-4000-8000-000000005801'),1,'all original completed work survives Repeat and End');

-- A confirmed replacement resolves the old boundary, while browsing alone writes nothing.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000005802',true);
insert into public.program_instances(id,user_id,template_id,template_version_id,title,status,start_date,units,rounding,current_week_index,state_version)
select '00000000-0000-4000-8000-000000005812','00000000-0000-4000-8000-000000005802',template_id,id,'Replace cycle','active',current_date,'lb',5,15,0
from public.program_template_versions where template_id='healthy-531-fsl' order by created_at desc limit 1;
update cycle_fixture set snapshot=jsonb_set(jsonb_set(snapshot,'{id}','"replacement-final"'),'{weekIndex}','15');
update cycle_fixture set session_id=public.start_session_v3('replace-cycle-start','00000000-0000-4000-8000-000000005812','replacement-final',current_date,snapshot,0,null);
select lives_ok($$select public.finish_session_v3(session_id,'replace-cycle-finish',null,null,null,null,'[]','[]',0,0) from cycle_fixture$$,'replacement fixture reaches boundary');
update cycle_fixture set boundary_id=(select id from public.program_cycle_boundaries where session_id=cycle_fixture.session_id);
select lives_ok($$select public.start_program_v2('confirmed-replacement',template_id,id,definition_checksum,'New weekly plan',current_date,'kg',2.5,null,'[]','[]','[]',true)
from public.program_template_versions where template_id='generic_alternating_5x5_lp' order by created_at desc limit 1$$,'confirmed replacement uses existing lifecycle');
select is((select status from public.program_cycle_boundaries where id=(select boundary_id from cycle_fixture)),'replaced','replacement saves old cycle outcome');
select is((select count(*)::integer from public.workout_sessions where id=(select session_id from cycle_fixture)),1,'replacement preserves source workout');
select is((select cycle_end_policy from public.program_instances where user_id='00000000-0000-4000-8000-000000005802' and status='active'),'auto_repeat','replacement follows its own routine policy');
select throws_ok($$select public.repeat_program_cycle_v1('00000000-0000-4000-8000-000000005812',boundary_id,1,'old-recap-repeat','00000000-0000-4000-8000-000000005802') from cycle_fixture$$,'PT409','CYCLE_NO_LONGER_PENDING','historical recap cannot repeat the replaced plan');
select * from finish();
rollback;
