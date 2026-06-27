-- Programme-level accessory swap rules for the accessory movements introduced by the
-- expanded template catalogue (Beginner Upper/Lower, Ramping 5x5, Power + Hypertrophy U/L,
-- 3-Day Volume-to-Intensity). Mirrors the in-code defaultMovementReplacementRules so every
-- built-in accessory slot stays swappable in the real app.

insert into public.movement_replacement_rules (
  id,
  source_movement_id,
  replacement_movement_id,
  role,
  relationship_label,
  allow_session_scope,
  allow_phase_slot_scope
) values
  ('romanian_deadlift-stiff_leg_deadlift-accessory', 'romanian_deadlift', 'stiff_leg_deadlift', 'accessory', 'Similar hinge accessory', true, true),
  ('romanian_deadlift-good_morning-accessory', 'romanian_deadlift', 'good_morning', 'accessory', 'Similar hinge accessory', true, true),
  ('incline_bench_press-incline_dumbbell_press-accessory', 'incline_bench_press', 'incline_dumbbell_press', 'accessory', 'Similar incline press', true, true),
  ('incline_bench_press-dumbbell_bench_press-accessory', 'incline_bench_press', 'dumbbell_bench_press', 'accessory', 'Similar press', true, true),
  ('front_squat-leg_press-accessory', 'front_squat', 'leg_press', 'accessory', 'Squat-pattern accessory', true, true),
  ('front_squat-hack_squat-accessory', 'front_squat', 'hack_squat', 'accessory', 'Squat-pattern accessory', true, true),
  ('seated_leg_curl-lying_leg_curl-accessory', 'seated_leg_curl', 'lying_leg_curl', 'accessory', 'Same movement pattern', true, true),
  ('seated_leg_curl-hamstring_curl-accessory', 'seated_leg_curl', 'hamstring_curl', 'accessory', 'Same movement pattern', true, true),
  ('rear_delt_fly-face_pull-accessory', 'rear_delt_fly', 'face_pull', 'accessory', 'Rear-delt accessory', true, true),
  ('rear_delt_fly-upright_row-accessory', 'rear_delt_fly', 'upright_row', 'accessory', 'Rear-delt accessory', true, true),
  ('overhead_triceps_extension-triceps_pressdown-accessory', 'overhead_triceps_extension', 'triceps_pressdown', 'accessory', 'Triceps accessory', true, true),
  ('overhead_triceps_extension-skullcrusher-accessory', 'overhead_triceps_extension', 'skullcrusher', 'accessory', 'Triceps accessory', true, true),
  ('hanging_leg_raise-cable_crunch-accessory', 'hanging_leg_raise', 'cable_crunch', 'accessory', 'Core accessory', true, true),
  ('hanging_leg_raise-ab_wheel_rollout-accessory', 'hanging_leg_raise', 'ab_wheel_rollout', 'accessory', 'Core accessory', true, true)
on conflict (id) do nothing;
