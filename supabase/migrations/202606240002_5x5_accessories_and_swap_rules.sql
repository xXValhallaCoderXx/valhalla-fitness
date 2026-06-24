-- Add neutral 5x5 assistance defaults and broaden curated programme-level
-- accessory swap rules for built-in template sources.

insert into public.movements (id, name, category, equipment, variation_of, default_unit, is_competition) values
  ('dumbbell_curl', 'Dumbbell Curl', 'upper', array['dumbbells']::text[], null, 'kg', false)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  equipment = excluded.equipment,
  variation_of = excluded.variation_of,
  default_unit = excluded.default_unit,
  is_competition = excluded.is_competition;

update public.program_templates
set description = 'Three-day beginner linear progression alternating A/B sessions with 5x5 work, a 1x5 deadlift, and simple suggested accessories.'
where id = 'generic_alternating_5x5_lp';

insert into public.program_template_versions (template_id, version, definition) values
(
  'generic_alternating_5x5_lp',
  '2026.06.5x5-accessories',
  $definition$
  {
    "schemaVersion": "2026.06.dsl",
    "id": "generic_alternating_5x5_lp",
    "name": "Beginner 5x5 Linear",
    "durationWeeks": 2,
    "daysPerWeek": 3,
    "requiredState": [
      { "key": "squat_working_load", "movementId": "squat", "type": "working_load" },
      { "key": "bench_press_working_load", "movementId": "bench_press", "type": "working_load" },
      { "key": "overhead_press_working_load", "movementId": "overhead_press", "type": "working_load" },
      { "key": "deadlift_working_load", "movementId": "deadlift", "type": "working_load" },
      { "key": "barbell_row_working_load", "movementId": "barbell_row", "type": "working_load" }
    ],
    "timelineDescription": "Two-week A/B rotation for three non-consecutive training days per week.",
    "sessions": [
      {
        "id": "day-1",
        "title": "Day 1",
        "estimatedMinutes": 70,
        "slots": [
          { "id": "squat", "role": "main", "movementId": "squat", "prescriptionId": "five-by-five" },
          { "id": "push", "role": "main", "movementId": { "default": "bench_press", "byPhase": { "starts_with_b": "overhead_press" } }, "prescriptionId": "five-by-five" },
          { "id": "pull", "role": "main", "movementId": { "default": "barbell_row", "byPhase": { "starts_with_b": "deadlift" } }, "prescriptionId": "outer-pull" },
          { "id": "accessory-1", "role": "accessory", "movementId": "chin_up", "prescriptionId": "vertical-pull" },
          { "id": "accessory-2", "role": "accessory", "movementId": "back_extension", "prescriptionId": "trunk-assistance" }
        ]
      },
      {
        "id": "day-2",
        "title": "Day 2",
        "estimatedMinutes": 65,
        "slots": [
          { "id": "squat", "role": "main", "movementId": "squat", "prescriptionId": "five-by-five" },
          { "id": "push", "role": "main", "movementId": { "default": "overhead_press", "byPhase": { "starts_with_b": "bench_press" } }, "prescriptionId": "five-by-five" },
          { "id": "pull", "role": "main", "movementId": { "default": "deadlift", "byPhase": { "starts_with_b": "barbell_row" } }, "prescriptionId": "middle-pull" },
          { "id": "accessory-1", "role": "accessory", "movementId": "lat_pulldown", "prescriptionId": "vertical-pull" },
          { "id": "accessory-2", "role": "accessory", "movementId": "sit_up", "prescriptionId": "trunk-assistance" }
        ]
      },
      {
        "id": "day-3",
        "title": "Day 3",
        "estimatedMinutes": 70,
        "slots": [
          { "id": "squat", "role": "main", "movementId": "squat", "prescriptionId": "five-by-five" },
          { "id": "push", "role": "main", "movementId": { "default": "bench_press", "byPhase": { "starts_with_b": "overhead_press" } }, "prescriptionId": "five-by-five" },
          { "id": "pull", "role": "main", "movementId": { "default": "barbell_row", "byPhase": { "starts_with_b": "deadlift" } }, "prescriptionId": "outer-pull" },
          { "id": "accessory-1", "role": "accessory", "movementId": "pull_up", "prescriptionId": "vertical-pull" },
          { "id": "accessory-2", "role": "accessory", "movementId": "cable_crunch", "prescriptionId": "trunk-assistance" }
        ]
      }
    ],
    "weeks": [
      {
        "label": "Week 1",
        "phaseKey": "starts_with_a",
        "phaseLabel": "Starts with A",
        "summary": "A/B/A rotation using squat every day, bench and row on A, overhead press and deadlift on B.",
        "hardness": "Medium",
        "prescriptions": {
          "five-by-five": {
            "targetSummary": "5x5 @ current working load",
            "progressionRuleId": "simple_linear_completion",
            "sets": [
              { "targetLoad": { "kind": "state", "stateType": "working_load" }, "targetReps": 5, "label": "5" },
              { "targetLoad": { "kind": "state", "stateType": "working_load" }, "targetReps": 5, "label": "5" },
              { "targetLoad": { "kind": "state", "stateType": "working_load" }, "targetReps": 5, "label": "5" },
              { "targetLoad": { "kind": "state", "stateType": "working_load" }, "targetReps": 5, "label": "5" },
              { "targetLoad": { "kind": "state", "stateType": "working_load" }, "targetReps": 5, "label": "5" }
            ]
          },
          "outer-pull": {
            "targetSummary": "5x5 @ current working load",
            "progressionRuleId": "simple_linear_completion",
            "sets": [
              { "targetLoad": { "kind": "state", "stateType": "working_load" }, "targetReps": 5, "label": "5" },
              { "targetLoad": { "kind": "state", "stateType": "working_load" }, "targetReps": 5, "label": "5" },
              { "targetLoad": { "kind": "state", "stateType": "working_load" }, "targetReps": 5, "label": "5" },
              { "targetLoad": { "kind": "state", "stateType": "working_load" }, "targetReps": 5, "label": "5" },
              { "targetLoad": { "kind": "state", "stateType": "working_load" }, "targetReps": 5, "label": "5" }
            ]
          },
          "middle-pull": {
            "targetSummary": "1x5 @ current working load",
            "progressionRuleId": "simple_linear_completion",
            "sets": [
              { "targetLoad": { "kind": "state", "stateType": "working_load" }, "targetReps": 5, "label": "5" }
            ]
          },
          "vertical-pull": {
            "targetSummary": "3 sets x 6-10 reps @ RIR 2",
            "progressionRuleId": "accessory_double_progression",
            "sets": [
              { "targetLoad": { "kind": "user_selected" }, "targetRepMin": 6, "targetRepMax": 10, "targetRir": 2, "label": "6-10" },
              { "targetLoad": { "kind": "user_selected" }, "targetRepMin": 6, "targetRepMax": 10, "targetRir": 2, "label": "6-10" },
              { "targetLoad": { "kind": "user_selected" }, "targetRepMin": 6, "targetRepMax": 10, "targetRir": 2, "label": "6-10" }
            ]
          },
          "trunk-assistance": {
            "targetSummary": "3 sets x 10-15 reps @ RIR 2",
            "progressionRuleId": "accessory_double_progression",
            "sets": [
              { "targetLoad": { "kind": "user_selected" }, "targetRepMin": 10, "targetRepMax": 15, "targetRir": 2, "label": "10-15" },
              { "targetLoad": { "kind": "user_selected" }, "targetRepMin": 10, "targetRepMax": 15, "targetRir": 2, "label": "10-15" },
              { "targetLoad": { "kind": "user_selected" }, "targetRepMin": 10, "targetRepMax": 15, "targetRir": 2, "label": "10-15" }
            ]
          }
        }
      },
      {
        "label": "Week 2",
        "phaseKey": "starts_with_b",
        "phaseLabel": "Starts with B",
        "summary": "B/A/B rotation so the alternating sequence stays continuous across weeks.",
        "hardness": "Medium",
        "prescriptions": {
          "five-by-five": {
            "targetSummary": "5x5 @ current working load",
            "progressionRuleId": "simple_linear_completion",
            "sets": [
              { "targetLoad": { "kind": "state", "stateType": "working_load" }, "targetReps": 5, "label": "5" },
              { "targetLoad": { "kind": "state", "stateType": "working_load" }, "targetReps": 5, "label": "5" },
              { "targetLoad": { "kind": "state", "stateType": "working_load" }, "targetReps": 5, "label": "5" },
              { "targetLoad": { "kind": "state", "stateType": "working_load" }, "targetReps": 5, "label": "5" },
              { "targetLoad": { "kind": "state", "stateType": "working_load" }, "targetReps": 5, "label": "5" }
            ]
          },
          "outer-pull": {
            "targetSummary": "1x5 @ current working load",
            "progressionRuleId": "simple_linear_completion",
            "sets": [
              { "targetLoad": { "kind": "state", "stateType": "working_load" }, "targetReps": 5, "label": "5" }
            ]
          },
          "middle-pull": {
            "targetSummary": "5x5 @ current working load",
            "progressionRuleId": "simple_linear_completion",
            "sets": [
              { "targetLoad": { "kind": "state", "stateType": "working_load" }, "targetReps": 5, "label": "5" },
              { "targetLoad": { "kind": "state", "stateType": "working_load" }, "targetReps": 5, "label": "5" },
              { "targetLoad": { "kind": "state", "stateType": "working_load" }, "targetReps": 5, "label": "5" },
              { "targetLoad": { "kind": "state", "stateType": "working_load" }, "targetReps": 5, "label": "5" },
              { "targetLoad": { "kind": "state", "stateType": "working_load" }, "targetReps": 5, "label": "5" }
            ]
          },
          "vertical-pull": {
            "targetSummary": "3 sets x 6-10 reps @ RIR 2",
            "progressionRuleId": "accessory_double_progression",
            "sets": [
              { "targetLoad": { "kind": "user_selected" }, "targetRepMin": 6, "targetRepMax": 10, "targetRir": 2, "label": "6-10" },
              { "targetLoad": { "kind": "user_selected" }, "targetRepMin": 6, "targetRepMax": 10, "targetRir": 2, "label": "6-10" },
              { "targetLoad": { "kind": "user_selected" }, "targetRepMin": 6, "targetRepMax": 10, "targetRir": 2, "label": "6-10" }
            ]
          },
          "trunk-assistance": {
            "targetSummary": "3 sets x 10-15 reps @ RIR 2",
            "progressionRuleId": "accessory_double_progression",
            "sets": [
              { "targetLoad": { "kind": "user_selected" }, "targetRepMin": 10, "targetRepMax": 15, "targetRir": 2, "label": "10-15" },
              { "targetLoad": { "kind": "user_selected" }, "targetRepMin": 10, "targetRepMax": 15, "targetRir": 2, "label": "10-15" },
              { "targetLoad": { "kind": "user_selected" }, "targetRepMin": 10, "targetRepMax": 15, "targetRir": 2, "label": "10-15" }
            ]
          }
        }
      }
    ],
    "progressionRules": {
      "main": "simple_linear_completion",
      "accessory": "accessory_double_progression"
    },
    "progressionConfig": {
      "simple_linear_completion": {
        "increments": {
          "squat": { "kg": 2.5, "lb": 5 },
          "bench_press": { "kg": 2.5, "lb": 5 },
          "overhead_press": { "kg": 2.5, "lb": 5 },
          "deadlift": { "kg": 5, "lb": 10 },
          "barbell_row": { "kg": 2.5, "lb": 5 }
        }
      }
    }
  }
  $definition$::jsonb
)
on conflict (template_id, version) do update set
  definition = excluded.definition;

insert into public.movement_replacement_rules (
  id,
  source_movement_id,
  replacement_movement_id,
  role,
  relationship_label,
  allow_session_scope,
  allow_phase_slot_scope
) values
  ('sit_up-cable_crunch-accessory', 'sit_up', 'cable_crunch', 'accessory', 'Core accessory', true, true),
  ('sit_up-hanging_leg_raise-accessory', 'sit_up', 'hanging_leg_raise', 'accessory', 'Core accessory', true, true),
  ('side_bend-cable_crunch-accessory', 'side_bend', 'cable_crunch', 'accessory', 'Core accessory', true, true),
  ('side_bend-sit_up-accessory', 'side_bend', 'sit_up', 'accessory', 'Core accessory', true, true),
  ('ab_wheel_rollout-cable_crunch-accessory', 'ab_wheel_rollout', 'cable_crunch', 'accessory', 'Core accessory', true, true),
  ('ab_wheel_rollout-hanging_leg_raise-accessory', 'ab_wheel_rollout', 'hanging_leg_raise', 'accessory', 'Core accessory', true, true),
  ('barbell_row-chest_supported_row-accessory', 'barbell_row', 'chest_supported_row', 'accessory', 'Similar row pattern', true, true),
  ('barbell_row-seated_cable_row-accessory', 'barbell_row', 'seated_cable_row', 'accessory', 'Similar row pattern', true, true),
  ('t_bar_row-barbell_row-accessory', 't_bar_row', 'barbell_row', 'accessory', 'Similar row pattern', true, true),
  ('t_bar_row-chest_supported_row-accessory', 't_bar_row', 'chest_supported_row', 'accessory', 'Similar row pattern', true, true),
  ('pendlay_row-barbell_row-accessory', 'pendlay_row', 'barbell_row', 'accessory', 'Similar row pattern', true, true),
  ('pendlay_row-chest_supported_row-accessory', 'pendlay_row', 'chest_supported_row', 'accessory', 'Similar row pattern', true, true),
  ('pull_up-chin_up-accessory', 'pull_up', 'chin_up', 'accessory', 'Vertical pull', true, true),
  ('pull_up-lat_pulldown-accessory', 'pull_up', 'lat_pulldown', 'accessory', 'Vertical pull', true, true),
  ('chin_up-pull_up-accessory', 'chin_up', 'pull_up', 'accessory', 'Vertical pull', true, true),
  ('chin_up-lat_pulldown-accessory', 'chin_up', 'lat_pulldown', 'accessory', 'Vertical pull', true, true),
  ('barbell_curl-dumbbell_curl-accessory', 'barbell_curl', 'dumbbell_curl', 'accessory', 'Curl accessory', true, true),
  ('dumbbell_curl-barbell_curl-accessory', 'dumbbell_curl', 'barbell_curl', 'accessory', 'Curl accessory', true, true),
  ('rope_pressdown-triceps_pressdown-accessory', 'rope_pressdown', 'triceps_pressdown', 'accessory', 'Triceps accessory', true, true),
  ('rope_pressdown-overhead_triceps_extension-accessory', 'rope_pressdown', 'overhead_triceps_extension', 'accessory', 'Triceps accessory', true, true),
  ('jm_press-triceps_pressdown-accessory', 'jm_press', 'triceps_pressdown', 'accessory', 'Triceps accessory', true, true),
  ('jm_press-skullcrusher-accessory', 'jm_press', 'skullcrusher', 'accessory', 'Triceps accessory', true, true),
  ('lunge-split_squat-accessory', 'lunge', 'split_squat', 'accessory', 'Unilateral lower-body option', true, true),
  ('lunge-leg_press-accessory', 'lunge', 'leg_press', 'accessory', 'Lower-body accessory', true, true),
  ('upright_row-face_pull-accessory', 'upright_row', 'face_pull', 'accessory', 'Upper-back accessory', true, true),
  ('upright_row-rear_delt_fly-accessory', 'upright_row', 'rear_delt_fly', 'accessory', 'Rear-delt accessory', true, true),
  ('good_morning-romanian_deadlift-variation', 'good_morning', 'romanian_deadlift', 'variation', 'Programmed hinge variation', true, true),
  ('good_morning-stiff_leg_deadlift-variation', 'good_morning', 'stiff_leg_deadlift', 'variation', 'Programmed hinge variation', true, true)
on conflict (id) do update set
  source_movement_id = excluded.source_movement_id,
  replacement_movement_id = excluded.replacement_movement_id,
  role = excluded.role,
  relationship_label = excluded.relationship_label,
  allow_session_scope = excluded.allow_session_scope,
  allow_phase_slot_scope = excluded.allow_phase_slot_scope,
  is_active = true;
