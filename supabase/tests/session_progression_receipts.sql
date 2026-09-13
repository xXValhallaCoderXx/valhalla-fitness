begin;
select no_plan();

insert into auth.users(id,email) values
  ('00000000-0000-4000-8000-000000003301','session-receipt-one@example.test'),
  ('00000000-0000-4000-8000-000000003302','session-receipt-two@example.test');
insert into public.profiles(id,email) values
  ('00000000-0000-4000-8000-000000003301','session-receipt-one@example.test'),
  ('00000000-0000-4000-8000-000000003302','session-receipt-two@example.test');
insert into public.program_instances(id,user_id,template_id,template_version_id,title,status,start_date,units,rounding,current_week_index,state_version)
select '00000000-0000-4000-8000-000000003311','00000000-0000-4000-8000-000000003301',template_id,id,'Receipt programme','active',current_date,'kg',2.5,0,0
from public.program_template_versions where template_id='generic_alternating_5x5_lp' order by created_at desc limit 1;

insert into public.workout_sessions(id,user_id,program_instance_id,planned_session_id,status,prescription_snapshot,state_version)
values
  ('00000000-0000-4000-8000-000000003321','00000000-0000-4000-8000-000000003301','00000000-0000-4000-8000-000000003311','first','in_progress','{"id":"first","title":"First workout","movements":[]}',0),
  ('00000000-0000-4000-8000-000000003322','00000000-0000-4000-8000-000000003301','00000000-0000-4000-8000-000000003311','second','planned','{"id":"second","movements":[]}',0),
  ('00000000-0000-4000-8000-000000003323','00000000-0000-4000-8000-000000003301','00000000-0000-4000-8000-000000003311','legacy','completed','{"id":"legacy","movements":[]}',1),
  ('00000000-0000-4000-8000-000000003324','00000000-0000-4000-8000-000000003301',null,null,'planned','{"id":"empty","kind":"ad_hoc","movements":[]}',0),
  ('00000000-0000-4000-8000-000000003325','00000000-0000-4000-8000-000000003302',null,null,'in_progress','{"id":"foreign","kind":"ad_hoc","movements":[]}',0);

-- Old programme-level decisions must remain unlinked even when a workout is replayed.
insert into public.progression_decisions(user_id,program_instance_id,movement_id,rule_id,scope,input_summary,recommendation)
values ('00000000-0000-4000-8000-000000003301','00000000-0000-4000-8000-000000003311','bench_press','simple_linear_completion','session','Older work','legacy');
update public.workout_sessions set finish_request_id='legacy-finish', finish_payload_hash=md5(jsonb_build_object(
  'notes',null,'sessionRpe',null,'reflectionWin',null,'reflectionImprove',null)::text)
where id='00000000-0000-4000-8000-000000003323';

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000003301',true);
select throws_ok($$select public.finish_session_v3(
  '00000000-0000-4000-8000-000000003321','invalid-finish',null,null,null,null,'[]',
  (select jsonb_agg(jsonb_build_object('movementId',movement,'ruleId','simple_linear_completion','scope','session',
    'inputSummary','Rollback work','recommendation','Rollback decision'))
   from (values ('bench_press'),('missing-receipt-movement')) movements(movement)),0,0)$$,
  '23503',null,'a rejected decision rolls back the whole finish');
select is((select status from public.workout_sessions where id='00000000-0000-4000-8000-000000003321'),'in_progress','failed finish does not complete the workout');
select ok(not (select progression_receipt_recorded from public.workout_sessions where id='00000000-0000-4000-8000-000000003321'),'failed finish does not publish a receipt marker');
select is((select count(*)::integer from public.progression_decisions where session_id='00000000-0000-4000-8000-000000003321'),0,'failed finish rolls back every inserted decision link');
select is((select current_week_index from public.program_instances where id='00000000-0000-4000-8000-000000003311'),0,'failed finish does not advance the programme');
select lives_ok($$select public.finish_session_v3(
  '00000000-0000-4000-8000-000000003321','first-finish','Saved notes',8,'Controlled work',null,'[]',
  (select jsonb_agg(jsonb_build_object('movementId','bench_press','ruleId','simple_linear_completion','scope','session',
    'inputSummary','Five reps completed','recommendation',label,'previousValue',80,'recommendedValue',82.5))
   from (values ('accept'),('dismiss'),('supersede'),('pending')) labels(label)),0,0)$$,
  'v3 finish atomically creates a session-specific receipt');
select is((select count(*)::integer from public.progression_decisions where session_id='00000000-0000-4000-8000-000000003321'),4,'all generated decisions link to the finishing workout');
select ok((select progression_receipt_recorded from public.workout_sessions where id='00000000-0000-4000-8000-000000003321'),'finish records receipt availability');
select is((select notes from public.workout_sessions where id='00000000-0000-4000-8000-000000003321'),'Saved notes','original reflection survives receipt storage');
select lives_ok($$select public.finish_session_v3('00000000-0000-4000-8000-000000003321','first-finish','Saved notes',8,'Controlled work',null,'[]','[]',null,0)$$,'lost finish response replays without regenerating decisions');
select is((select count(*)::integer from public.progression_decisions where session_id='00000000-0000-4000-8000-000000003321'),4,'replay does not duplicate links or decisions');
select is((select current_week_index from public.program_instances where id='00000000-0000-4000-8000-000000003311'),1,'replay does not advance programme twice');

select lives_ok($$select public.resolve_progression_decisions_v2(
  array(select id from public.progression_decisions where session_id='00000000-0000-4000-8000-000000003321' and recommendation='accept'),
  'accepted','accept-receipt')$$,'accepted decisions retain their session receipt');
select lives_ok($$select public.resolve_progression_decisions_v2(
  array(select id from public.progression_decisions where session_id='00000000-0000-4000-8000-000000003321' and recommendation='dismiss'),
  'dismissed','dismiss-receipt')$$,'dismissed decisions retain their session receipt');
-- Supersession is an internal programme operation; its existing return contracts cover the transition.
update public.progression_decisions set status='superseded',resolved_at=now()
where session_id='00000000-0000-4000-8000-000000003321' and recommendation='supersede';
select results_eq(
  $$select status from public.progression_decisions where session_id='00000000-0000-4000-8000-000000003321' order by status$$,
  $$values ('accepted'::text),('dismissed'::text),('pending'::text),('superseded'::text)$$,
  'receipt keeps accepted, dismissed, pending and superseded decisions');
select lives_ok($$select public.finish_session_v3('00000000-0000-4000-8000-000000003321','first-finish','Saved notes',8,'Controlled work',null,'[]','[]',null,0)$$,'finish replay after resolutions is still idempotent');
select results_eq(
  $$select status from public.progression_decisions where session_id='00000000-0000-4000-8000-000000003321' order by status$$,
  $$values ('accepted'::text),('dismissed'::text),('pending'::text),('superseded'::text)$$,
  'replay never restores resolved decisions to pending');

update public.workout_sessions set status='in_progress' where id='00000000-0000-4000-8000-000000003322';
select lives_ok($$select public.finish_session_v2('00000000-0000-4000-8000-000000003322','second-finish',null,null,null,null,'[]',
  '[{"movementId":"bench_press","ruleId":"simple_linear_completion","scope":"session","inputSummary":"Other work","recommendation":"other workout"}]',
  (select state_version from public.program_instances where id='00000000-0000-4000-8000-000000003311'),0)$$,
  'legacy public v2 also records exact decision provenance');
select is((select count(*)::integer from public.progression_decisions where session_id='00000000-0000-4000-8000-000000003322'),1,'later workout receives only its own decisions');
select is((select count(*)::integer from public.progression_decisions where session_id='00000000-0000-4000-8000-000000003321'),4,'later finish leaves the original receipt unchanged');

update public.workout_sessions set status='in_progress' where id='00000000-0000-4000-8000-000000003324';
select lives_ok($$select public.finish_session_v3('00000000-0000-4000-8000-000000003324','empty-finish',null,null,null,null,'[]','[]',null,0)$$,'ad-hoc workout with no decisions records an empty receipt');
select ok((select progression_receipt_recorded from public.workout_sessions where id='00000000-0000-4000-8000-000000003324'),'new zero-decision finish is distinguishable from legacy');
select lives_ok($$select public.finish_session_v3('00000000-0000-4000-8000-000000003323','legacy-finish',null,null,null,null,'[]','[]',null,0)$$,'older completed workout remains replayable');
select ok(not (select progression_receipt_recorded from public.workout_sessions where id='00000000-0000-4000-8000-000000003323'),'legacy replay does not falsely mark provenance recorded');
select is((select count(*)::integer from public.progression_decisions where recommendation='legacy' and session_id is null),1,'older decisions are never guessed into session links');

select throws_ok($$insert into public.progression_decisions(user_id,program_instance_id,session_id,movement_id,rule_id,scope,input_summary,recommendation)
  values ('00000000-0000-4000-8000-000000003301','00000000-0000-4000-8000-000000003311','00000000-0000-4000-8000-000000003325','bench_press','simple_linear_completion','session','Forged','Cross account')$$,
  '23503',null,'receipt foreign key prevents linking another account workout');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000003302',true);
set local role authenticated;
select is((select count(*)::integer from public.progression_decisions where session_id='00000000-0000-4000-8000-000000003321'),0,'RLS hides another account receipt');
select is((select count(*)::integer from public.workout_sessions where id='00000000-0000-4000-8000-000000003321'),0,'RLS hides another account receipt marker');
select throws_ok($$select public.finish_session_v3('00000000-0000-4000-8000-000000003321','first-finish','Saved notes',8,'Controlled work',null,'[]','[]',null,0)$$,
  'P0001','SESSION_NOT_FOUND','another account cannot replay the finish');
select ok(not has_function_privilege('authenticated','public.finish_session_before_return(uuid,text,text,integer,text,text,jsonb,jsonb,integer,integer)','EXECUTE'),'private finish implementation remains inaccessible');
reset role;
select * from finish();
rollback;
