insert into public.movements (id, name, category, equipment, variation_of, is_competition) values
  ('squat', 'Squat', 'lower', array['barbell', 'rack', 'plates'], null, true),
  ('bench_press', 'Bench Press', 'upper', array['barbell', 'bench', 'plates'], null, true),
  ('deadlift', 'Deadlift', 'lower', array['barbell', 'plates'], null, true),
  ('overhead_press', 'Overhead Press', 'upper', array['barbell', 'rack', 'plates'], null, true),
  ('romanian_deadlift', 'Romanian Deadlift', 'hinge', array['barbell', 'plates'], 'deadlift', false),
  ('chest_supported_row', 'Chest-Supported Row', 'upper_back', array['machine', 'dumbbells'], null, false),
  ('lat_pulldown', 'Lat Pulldown', 'upper_back', array['cable', 'machine'], null, false),
  ('leg_press', 'Leg Press', 'lower', array['machine'], 'squat', false),
  ('hamstring_curl', 'Hamstring Curl', 'posterior_chain', array['machine'], null, false),
  ('back_extension', 'Back Extension', 'posterior_chain', array['machine', 'bodyweight'], null, false),
  ('cable_crunch', 'Cable Crunch', 'core', array['cable'], null, false),
  ('dumbbell_row', 'Dumbbell Row', 'upper_back', array['dumbbells', 'bench'], null, false),
  ('incline_dumbbell_press', 'Incline Dumbbell Press', 'upper', array['dumbbells', 'bench'], 'bench_press', false),
  ('triceps_pressdown', 'Triceps Pressdown', 'upper', array['cable'], null, false),
  ('face_pull', 'Face Pull', 'upper_back', array['cable'], null, false)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  equipment = excluded.equipment,
  variation_of = excluded.variation_of,
  is_competition = excluded.is_competition;

insert into public.program_templates (
  id, name, source, description, days_per_week, progression_label, complexity, schema_version, tags
) values
  (
    'healthy-531-fsl',
    'Healthy 5/3/1 FSL',
    'healthy_531',
    'Standard 5/3/1 training-max progression with First Set Last supplemental work and structured accessories.',
    4,
    'TM progression + FSL',
    'Intermediate',
    '2026.06',
    array['5/3/1', 'base']
  ),
  (
    'bromley-bullmastiff',
    'Bromley Bullmastiff',
    'bromley_base_strength',
    'Four-day upper/lower plan with autoregulated plus sets, variations, and bodybuilding accessories.',
    4,
    'Plus-set wave',
    'Advanced',
    '2026.06',
    array['bromley', 'base', 'high volume']
  )
on conflict (id) do update set
  name = excluded.name,
  source = excluded.source,
  description = excluded.description,
  days_per_week = excluded.days_per_week,
  progression_label = excluded.progression_label,
  complexity = excluded.complexity,
  schema_version = excluded.schema_version,
  tags = excluded.tags,
  is_active = true;

insert into public.program_template_versions (template_id, version, definition) values
  (
    'healthy-531-fsl',
    '2026.06',
    '{
      "id": "healthy-531-fsl",
      "name": "Healthy 5/3/1 FSL",
      "anchorType": "training_max",
      "cycleWeeks": 4,
      "days": [
        {"id": "squat-day", "title": "Squat + Lower Accessories", "mainMovementId": "squat", "accessories": ["leg_press", "hamstring_curl", "cable_crunch"]},
        {"id": "bench-day", "title": "Bench + Upper Back", "mainMovementId": "bench_press", "accessories": ["chest_supported_row", "incline_dumbbell_press", "triceps_pressdown"]},
        {"id": "deadlift-day", "title": "Deadlift + Posterior Chain", "mainMovementId": "deadlift", "accessories": ["romanian_deadlift", "back_extension", "cable_crunch"]},
        {"id": "press-day", "title": "Overhead Press + Upper Back", "mainMovementId": "overhead_press", "accessories": ["lat_pulldown", "face_pull", "dumbbell_row"]}
      ]
    }'::jsonb
  ),
  (
    'bromley-bullmastiff',
    '2026.06',
    '{
      "id": "bromley-bullmastiff",
      "name": "Bromley Bullmastiff",
      "anchorType": "training_max",
      "cycleWeeks": 3,
      "days": [
        {"id": "bull-squat", "title": "Bullmastiff Squat", "mainMovementId": "squat", "variationMovementId": "romanian_deadlift", "accessories": ["leg_press", "hamstring_curl"]},
        {"id": "bull-bench", "title": "Bullmastiff Bench", "mainMovementId": "bench_press", "variationMovementId": "incline_dumbbell_press", "accessories": ["chest_supported_row", "triceps_pressdown"]},
        {"id": "bull-deadlift", "title": "Bullmastiff Deadlift", "mainMovementId": "deadlift", "variationMovementId": "romanian_deadlift", "accessories": ["back_extension", "cable_crunch"]},
        {"id": "bull-press", "title": "Bullmastiff Overhead Press", "mainMovementId": "overhead_press", "variationMovementId": "bench_press", "accessories": ["lat_pulldown", "face_pull"]}
      ]
    }'::jsonb
  )
on conflict (template_id, version) do update set
  definition = excluded.definition;
