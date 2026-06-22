insert into public.movements (id, name, category, equipment, variation_of, default_unit, is_competition)
values
  ('front_squat', 'Front Squat', 'lower', array['barbell', 'rack', 'plates']::text[], 'squat', 'kg', false),
  ('close_grip_bench_press', 'Close-Grip Bench Press', 'upper', array['barbell', 'bench', 'plates']::text[], 'bench_press', 'kg', false),
  ('stiff_leg_deadlift', 'Stiff-Leg Deadlift', 'hinge', array['barbell', 'plates']::text[], 'deadlift', 'kg', false),
  ('behind_neck_press', 'Behind-the-Neck Press', 'upper', array['barbell', 'rack', 'plates']::text[], 'overhead_press', 'kg', false),
  ('pause_squat', 'Pause Squat', 'lower', array['barbell', 'rack', 'plates']::text[], 'squat', 'kg', false),
  ('board_press', 'Board Press', 'upper', array['barbell', 'bench', 'plates']::text[], 'bench_press', 'kg', false),
  ('low_trap_bar_deadlift', 'Low Trap Bar Deadlift', 'hinge', array['specialty_bars', 'plates']::text[], 'deadlift', 'kg', false),
  ('seated_pin_press', 'Seated Pin Press', 'upper', array['barbell', 'rack', 'bench', 'plates']::text[], 'overhead_press', 'kg', false)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  equipment = excluded.equipment,
  variation_of = excluded.variation_of,
  default_unit = excluded.default_unit,
  is_competition = excluded.is_competition;
