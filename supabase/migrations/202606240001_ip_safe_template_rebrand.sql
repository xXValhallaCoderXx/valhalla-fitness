-- Reframe built-in templates around neutral Sheetless programming primitives.
-- Legacy template ids stay stable so existing programme instances and pinned
-- template versions remain loadable.

update public.program_templates
set origin = 'system_default'
where origin = 'coach_authored';

alter table public.program_templates
  drop constraint if exists program_templates_origin_check;

alter table public.program_templates
  add constraint program_templates_origin_check
  check (origin in ('system_default', 'licensed_partner', 'user_created'));

update public.program_templates
set source = 'custom_program'
where source = 'custom_import';

update public.program_templates as template
set
  name = template_values.name,
  source = template_values.source,
  origin = 'system_default',
  description = template_values.description,
  progression_label = template_values.progression_label,
  complexity = template_values.complexity,
  tags = template_values.tags,
  is_active = true
from (
  values
    (
      'generic_alternating_5x5_lp',
      'Beginner 5x5 Linear',
      'linear_strength',
      'Three-day beginner linear progression alternating A/B sessions with 5x5 work and a 1x5 deadlift.',
      'Working-load LP',
      'Beginner',
      array['linear', '5x5', 'beginner']::text[]
    ),
    (
      'healthy-531-fsl',
      'Training Max Wave',
      'training_max_wave',
      '4-week training-max percentage wave with back-off work and structured accessories.',
      'Training-max wave',
      'Intermediate',
      array['training max', 'wave', 'strength']::text[]
    ),
    (
      'bromley-bullmastiff',
      'Old School Wave Powerbuilding',
      'wave_powerbuilding',
      '18-week upper/lower wave structure with base and peak phases, plus-set regulation, variations, and bodybuilding accessories.',
      'Plus-set waves',
      'Advanced',
      array['wave', 'powerbuilding', 'high volume']::text[]
    ),
    (
      'bromley-70s-powerlifter',
      'Classic Volume Strength',
      'volume_strength',
      '18-week upper/lower plan with volumizing waves, intensifying waves, variations, and bodybuilding layers.',
      'Base-to-peak waves',
      'Advanced',
      array['volume', 'strength', 'peak']::text[]
    ),
    (
      'bromley-volume-intensity',
      'Volume-Intensity Strength',
      'volume_strength',
      'Three-day whole-body split alternating a 3-week volume wave with a 3-week top-set wave.',
      'Alternating volume/intensity waves',
      'Intermediate',
      array['volume', 'intensity', 'strength']::text[]
    )
) as template_values(id, name, source, description, progression_label, complexity, tags)
where template.id = template_values.id;

with rewritten_versions as (
  select
    id,
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(definition::text,
      'Healthy 5/3/1 FSL', 'Training Max Wave'),
      '4-week 5/3/1 cycle', '4-week training-max percentage wave'),
      '5/3/1 week', 'Peak week'),
      'First Set Last', 'back-off'),
      'FSL', 'back-off'),
      'healthy_531_tm_band', 'training_max_band'),
      'Bromley Bullmastiff', 'Old School Wave Powerbuilding'),
      'Bullmastiff Squat', 'Squat Wave'),
      'Bullmastiff Bench', 'Bench Wave'),
      'Bullmastiff Deadlift', 'Deadlift Wave'),
      'Bullmastiff Overhead Press', 'Press Wave'),
      'Bullmastiff', 'Wave'),
      'Bromley 70s Powerlifter', 'Classic Volume Strength'),
      '70s Bench', 'Bench Volume'),
      '70s Squat', 'Squat Volume'),
      '70s Overhead Press', 'Press Volume'),
      '70s Deadlift', 'Deadlift Volume'),
      'Bromley Volume/Intensity', 'Volume-Intensity Strength'),
      'Volume/Intensity', 'Volume-Intensity'),
      'bullmastiff_plus_set', 'plus_set_wave'),
      'bromley_step_load', 'wave_step_load'),
      'bromley_variation_step_sets', 'variation_step_sets'),
      'bromley_peak_top_set', 'peak_top_set'),
      'bromley_peak_variation', 'peak_variation'),
      'bromley_volume_track', 'volume_track') as definition_text
  from public.program_template_versions
  where template_id in (
    'generic_alternating_5x5_lp',
    'healthy-531-fsl',
    'bromley-bullmastiff',
    'bromley-70s-powerlifter',
    'bromley-volume-intensity'
  )
)
update public.program_template_versions as version
set definition = replace(rewritten_versions.definition_text, 'bromley_intensity_track', 'intensity_track')::jsonb
from rewritten_versions
where version.id = rewritten_versions.id;

drop policy if exists "templates are public or owned custom read" on public.program_templates;
drop policy if exists "users can insert own custom templates" on public.program_templates;
drop policy if exists "users can update own custom templates" on public.program_templates;
drop policy if exists "template versions are public or owned custom read" on public.program_template_versions;
drop policy if exists "users can insert own custom template versions" on public.program_template_versions;
drop policy if exists "users can update own custom template versions" on public.program_template_versions;

create policy "templates are public or owned custom read" on public.program_templates
  for select using (
    (
      is_active = true
      and origin in ('system_default', 'licensed_partner')
    )
    or (
      origin = 'user_created'
      and created_by = auth.uid()
    )
  );

create policy "users can insert own custom templates" on public.program_templates
  for insert with check (
    origin = 'user_created'
    and source = 'custom_program'
    and created_by = auth.uid()
  );

create policy "users can update own custom templates" on public.program_templates
  for update using (
    origin = 'user_created'
    and created_by = auth.uid()
  ) with check (
    origin = 'user_created'
    and source = 'custom_program'
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
            and t.origin in ('system_default', 'licensed_partner')
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
