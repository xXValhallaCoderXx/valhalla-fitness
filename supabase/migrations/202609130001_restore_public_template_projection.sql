-- Public browsing needs only catalogue fields and published plan definitions.
-- Keep lifecycle tables closed to anonymous writes and retain the existing
-- authenticated RLS rule for public templates versus owner-only custom plans.
-- Column grants deliberately exclude created_by, parent_template_id and other
-- internal template metadata; SELECT * remains unavailable to anonymous clients.
grant select (
  id, name, source, origin, description, days_per_week, progression_label,
  complexity, tags, is_active
) on public.program_templates to anon;

grant select (
  id, template_id, definition, definition_checksum, created_at
) on public.program_template_versions to anon;

-- The owner-aware version policy reads created_by from its parent template.
-- Anonymous readers must not gain that private column just to check visibility.
alter policy "templates are public or owned custom read"
  on public.program_templates to authenticated;
alter policy "template versions are public or owned custom read"
  on public.program_template_versions to authenticated;

create policy "anonymous templates are active public read"
  on public.program_templates for select to anon
  using (is_active and origin in ('system_default', 'licensed_partner'));

create policy "anonymous template versions are active public read"
  on public.program_template_versions for select to anon
  using (exists (
    select 1 from public.program_templates as template
    where template.id = template_id
      and template.is_active
      and template.origin in ('system_default', 'licensed_partner')
  ));
