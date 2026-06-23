drop policy if exists "templates are public read" on public.program_templates;
drop policy if exists "template versions are public read" on public.program_template_versions;

create policy "templates are public or owned custom read" on public.program_templates
  for select using (
    (
      is_active = true
      and origin in ('system_default', 'coach_authored')
    )
    or (
      origin = 'user_created'
      and created_by = auth.uid()
    )
  );

create policy "users can insert own custom templates" on public.program_templates
  for insert with check (
    origin = 'user_created'
    and source = 'custom_import'
    and created_by = auth.uid()
  );

create policy "users can update own custom templates" on public.program_templates
  for update using (
    origin = 'user_created'
    and created_by = auth.uid()
  ) with check (
    origin = 'user_created'
    and source = 'custom_import'
    and created_by = auth.uid()
  );

create policy "template versions are public or owned custom read" on public.program_template_versions
  for select using (
    exists (
      select 1
      from public.program_templates t
      where t.id = template_id
        and (
          (
            t.is_active = true
            and t.origin in ('system_default', 'coach_authored')
          )
          or (
            t.origin = 'user_created'
            and t.created_by = auth.uid()
          )
        )
    )
  );

create policy "users can insert own custom template versions" on public.program_template_versions
  for insert with check (
    exists (
      select 1
      from public.program_templates t
      where t.id = template_id
        and t.origin = 'user_created'
        and t.created_by = auth.uid()
    )
  );

create policy "users can update own custom template versions" on public.program_template_versions
  for update using (
    exists (
      select 1
      from public.program_templates t
      where t.id = template_id
        and t.origin = 'user_created'
        and t.created_by = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.program_templates t
      where t.id = template_id
        and t.origin = 'user_created'
        and t.created_by = auth.uid()
    )
  );

grant select, insert, update on public.program_templates to authenticated;
grant select, insert, update on public.program_template_versions to authenticated;
grant select on public.program_templates to anon;
grant select on public.program_template_versions to anon;
