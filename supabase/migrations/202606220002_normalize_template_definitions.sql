update public.program_templates
set
  description = '4-week 5/3/1 training-max progression with First Set Last supplemental work and structured accessories.',
  progression_label = 'TM progression + FSL'
where id = 'healthy-531-fsl';

update public.program_templates
set
  description = '18-week upper/lower Bullmastiff structure with base and peak phases, autoregulated plus sets, variations, and bodybuilding accessories.',
  progression_label = '18-week plus-set waves'
where id = 'bromley-bullmastiff';

insert into public.program_template_versions (template_id, version, definition) values
  (
    'healthy-531-fsl',
    '2026.06',
    '{
      "schemaVersion": "2026.06.timeline",
      "id": "healthy-531-fsl",
      "name": "Healthy 5/3/1 FSL",
      "anchorType": "training_max",
      "durationWeeks": 4,
      "daysPerWeek": 4,
      "timeline": {
        "kind": "cycle",
        "weeks": [
          {"week": 1, "label": "5s week", "mainPrescription": "65%x5 · 75%x5 · 85%x5+", "supplemental": "FSL 5x5"},
          {"week": 2, "label": "3s week", "mainPrescription": "70%x3 · 80%x3 · 90%x3+", "supplemental": "FSL 5x5"},
          {"week": 3, "label": "5/3/1 week", "mainPrescription": "75%x5 · 85%x3 · 95%x1+", "supplemental": "FSL 5x5"},
          {"week": 4, "label": "Deload", "mainPrescription": "40%x5 · 50%x5 · 60%x5", "supplemental": "No FSL"}
        ],
        "sessions": [
          {"id": "squat-day", "title": "Squat + Lower Accessories", "mainMovementId": "squat", "accessories": ["leg_press", "hamstring_curl", "cable_crunch"]},
          {"id": "bench-day", "title": "Bench + Upper Back", "mainMovementId": "bench_press", "accessories": ["chest_supported_row", "incline_dumbbell_press", "triceps_pressdown"]},
          {"id": "deadlift-day", "title": "Deadlift + Posterior Chain", "mainMovementId": "deadlift", "accessories": ["romanian_deadlift", "back_extension", "cable_crunch"]},
          {"id": "press-day", "title": "Overhead Press + Upper Back", "mainMovementId": "overhead_press", "accessories": ["lat_pulldown", "face_pull", "dumbbell_row"]}
        ]
      }
    }'::jsonb
  ),
  (
    'bromley-bullmastiff',
    '2026.06',
    '{
      "schemaVersion": "2026.06.timeline",
      "id": "bromley-bullmastiff",
      "name": "Bromley Bullmastiff",
      "anchorType": "training_max",
      "durationWeeks": 18,
      "daysPerWeek": 4,
      "timeline": {
        "kind": "base_peak_waves",
        "phases": [
          {
            "id": "base",
            "label": "Base phase",
            "weeks": 9,
            "waves": [
              {"wave": 1, "main": {"sets": 4, "reps": 6, "plus": true, "percent": 0.70}, "variation": {"setsByWeek": [3, 4, 5], "reps": 12, "percent": 0.60}},
              {"wave": 2, "main": {"sets": 4, "reps": 5, "plus": true, "percent": 0.75}, "variation": {"setsByWeek": [3, 4, 5], "reps": 10, "percent": 0.65}},
              {"wave": 3, "main": {"sets": 4, "reps": 4, "plus": true, "percent": 0.80}, "variation": {"setsByWeek": [3, 4, 5], "reps": 8, "percent": 0.70}}
            ]
          },
          {
            "id": "peak",
            "label": "Peak phase",
            "weeks": 9,
            "waves": [
              {"wave": 1, "main": {"setsByWeek": [5, 3, 1], "reps": 3, "plus": true, "percent": 0.85}, "variation": {"setsByWeek": [4, 3, 2], "reps": 6, "percent": 0.75}},
              {"wave": 2, "main": {"setsByWeek": [5, 3, 1], "reps": 2, "plus": true, "percent": 0.88}, "variation": {"setsByWeek": [4, 3, 2], "reps": 5, "percent": 0.80}},
              {"wave": 3, "main": {"setsByWeek": [5, 3, 1], "reps": 1, "plus": true, "percent": 0.92}, "variation": {"setsByWeek": [4, 3, 2], "reps": 4, "percent": 0.85}}
            ]
          }
        ],
        "sessions": [
          {"id": "bull-squat", "title": "Bullmastiff Squat", "mainMovementId": "squat", "baseVariationMovementId": "front_squat", "peakVariationMovementId": "pause_squat", "accessories": ["leg_press", "hamstring_curl"]},
          {"id": "bull-bench", "title": "Bullmastiff Bench", "mainMovementId": "bench_press", "baseVariationMovementId": "close_grip_bench_press", "peakVariationMovementId": "board_press", "accessories": ["chest_supported_row", "triceps_pressdown"]},
          {"id": "bull-deadlift", "title": "Bullmastiff Deadlift", "mainMovementId": "deadlift", "baseVariationMovementId": "stiff_leg_deadlift", "peakVariationMovementId": "low_trap_bar_deadlift", "accessories": ["back_extension", "cable_crunch"]},
          {"id": "bull-press", "title": "Bullmastiff Overhead Press", "mainMovementId": "overhead_press", "baseVariationMovementId": "behind_neck_press", "peakVariationMovementId": "seated_pin_press", "accessories": ["lat_pulldown", "face_pull"]}
        ]
      },
      "progressionRules": {
        "main": "plus_set_load",
        "variation": "step_load_sets",
        "accessory": "double_progression"
      }
    }'::jsonb
  )
on conflict (template_id, version) do update set
  definition = excluded.definition;
