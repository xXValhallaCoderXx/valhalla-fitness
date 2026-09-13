begin;
select plan(14);

insert into auth.users(id, email) values
  ('00000000-0000-4000-8000-000000004201', 'she42-owner@example.test'),
  ('00000000-0000-4000-8000-000000004202', 'she42-other@example.test');
insert into public.profiles(id, email) values
  ('00000000-0000-4000-8000-000000004201', 'she42-owner@example.test'),
  ('00000000-0000-4000-8000-000000004202', 'she42-other@example.test');
insert into public.program_templates
  (id, name, source, origin, description, days_per_week, progression_label, complexity, schema_version, is_active, created_by)
values
  ('she42-public', 'Public', 'linear_strength', 'system_default', 'Public plan', 3, 'Linear', 'beginner', '2026.06.dsl', true, null),
  ('she42-partner', 'Partner', 'linear_strength', 'licensed_partner', 'Partner plan', 3, 'Linear', 'beginner', '2026.06.dsl', true, null),
  ('she42-inactive', 'Inactive', 'linear_strength', 'system_default', 'Inactive plan', 3, 'Linear', 'beginner', '2026.06.dsl', false, null),
  ('she42-owned', 'Owned', 'custom_program', 'user_created', 'Private plan', 3, 'Linear', 'beginner', '2026.06.dsl', true, '00000000-0000-4000-8000-000000004201'),
  ('she42-other', 'Other', 'custom_program', 'user_created', 'Other private plan', 3, 'Linear', 'beginner', '2026.06.dsl', true, '00000000-0000-4000-8000-000000004202');
insert into public.program_template_versions(template_id, version, definition)
select id, 'she42', jsonb_build_object('id', id, 'requiredState', '[]'::jsonb)
from public.program_templates where id like 'she42-%';

select ok(
  not has_table_privilege('anon', 'public.program_templates', 'SELECT')
  and has_column_privilege('anon', 'public.program_templates', 'name', 'SELECT'),
  'anonymous catalogue access uses a column projection, not a table-wide grant'
);
select ok(
  not has_column_privilege('anon', 'public.program_templates', 'created_by', 'SELECT')
  and not has_column_privilege('anon', 'public.program_templates', 'parent_template_id', 'SELECT'),
  'anonymous projection excludes ownership and internal template metadata'
);
select ok(
  not has_table_privilege('anon', 'public.program_templates', 'INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES')
  and not has_table_privilege('anon', 'public.program_template_versions', 'INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES')
  and not has_table_privilege('authenticated', 'public.program_templates', 'INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES')
  and not has_table_privilege('authenticated', 'public.program_template_versions', 'INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES'),
  'both client roles retain the lifecycle write boundary'
);

select set_config('request.jwt.claim.sub', '', true);
set local role anon;
select results_eq(
  $$select id from public.program_templates where id like 'she42-%' and is_active order by id$$,
  $$values ('she42-partner'::text), ('she42-public'::text)$$,
  'anonymous visitors see active built-in and partner plans, never inactive or custom plans'
);
select results_eq(
  $$select template_id from public.program_template_versions where template_id like 'she42-%' order by template_id$$,
  $$values ('she42-partner'::text), ('she42-public'::text)$$,
  'anonymous definition reads enforce the same public-only isolation'
);
select throws_ok($$select * from public.program_templates$$, '42501', null, 'anonymous SELECT star stays denied');
select throws_ok($$select created_by from public.program_templates$$, '42501', null, 'anonymous ownership reads stay denied');
select throws_ok($$insert into public.program_templates(id) values('she42-injected')$$, '42501', null, 'anonymous template insertion is denied');
select throws_ok($$update public.program_templates set name='Changed' where id='she42-public'$$, '42501', null, 'anonymous template update is denied');
select throws_ok($$delete from public.program_template_versions where template_id='she42-public'$$, '42501', null, 'anonymous definition deletion is denied');
select lives_ok($$
  select id, template_id, definition, definition_checksum from public.program_template_versions
  where template_id='she42-public' order by created_at desc, id desc limit 1;
  select id from public.movements limit 1;
  select id from public.movement_replacement_rules where is_active limit 1;
  select id, version, definition, definition_checksum from public.equipment_mode_policy_versions
  where mode='free_weight' order by created_at desc, id desc limit 1;
$$, 'anonymous typical-week preview can read its published definition and public movement/policy dependencies');
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000004201', true);
set local role authenticated;
select results_eq(
  $$select id from public.program_templates where id like 'she42-%' and is_active order by id$$,
  $$values ('she42-owned'::text), ('she42-partner'::text), ('she42-public'::text)$$,
  'authenticated catalogue preserves its own custom plan without leaking another account'
);
select is(
  (select created_by from public.program_templates where id='she42-owned'),
  '00000000-0000-4000-8000-000000004201'::uuid,
  'authenticated owner metadata remains readable under existing RLS'
);
select results_eq(
  $$select template_id from public.program_template_versions where template_id like 'she42-%' order by template_id$$,
  $$values ('she42-owned'::text), ('she42-partner'::text), ('she42-public'::text)$$,
  'authenticated definition reads preserve own custom and public plans only'
);
reset role;
select * from finish();
rollback;
