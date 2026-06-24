truncate table
  public.progression_decisions,
  public.substitution_logs,
  public.set_logs,
  public.exercise_logs,
  public.workout_sessions,
  public.program_movement_overrides,
  public.program_accessory_additions,
  public.program_instances
restart identity cascade;

drop table if exists public.program_anchors cascade;

create table if not exists public.program_state_values (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_instance_id uuid not null references public.program_instances(id) on delete cascade,
  key text not null,
  movement_id text not null references public.movements(id),
  state_type text not null check (state_type in ('training_max', 'one_rep_max', 'working_load', 'five_rep_max', 'manual')),
  label text,
  value numeric not null,
  unit text not null check (unit in ('kg', 'lb')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_instance_id, key)
);

alter table public.program_state_values enable row level security;

drop policy if exists "program state values are self owned" on public.program_state_values;
create policy "program state values are self owned" on public.program_state_values
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists program_state_values_touch_updated_at on public.program_state_values;
create trigger program_state_values_touch_updated_at
before update on public.program_state_values
for each row execute function public.touch_updated_at();

alter table public.progression_decisions
  drop column if exists previous_anchor,
  drop column if exists recommended_anchor,
  add column if not exists state_key text,
  add column if not exists state_type text
    check (state_type is null or state_type in ('training_max', 'one_rep_max', 'working_load', 'five_rep_max', 'manual')),
  add column if not exists previous_value numeric,
  add column if not exists recommended_value numeric;

grant select, insert, update, delete on public.program_state_values to authenticated;

insert into public.program_templates (
  id, name, source, origin, description, days_per_week, progression_label, complexity, schema_version, tags, is_active
) values (
  'generic_alternating_5x5_lp',
  'Alternating 5x5 LP',
  'linear_strength',
  'system_default',
  'Three-day beginner linear progression alternating A/B sessions with 5x5 work and a 1x5 deadlift.',
  3,
  'Working-load LP',
  'Beginner',
  '2026.06.dsl',
  array['linear', '5x5', 'beginner']::text[],
  true
)
on conflict (id) do update set
  name = excluded.name,
  source = excluded.source,
  origin = excluded.origin,
  description = excluded.description,
  days_per_week = excluded.days_per_week,
  progression_label = excluded.progression_label,
  complexity = excluded.complexity,
  schema_version = excluded.schema_version,
  tags = excluded.tags,
  is_active = true;

insert into public.program_template_versions (template_id, version, definition) values
  ('generic_alternating_5x5_lp', '2026.06-state', $definition$
  {
    "schemaVersion": "2026.06.dsl",
    "id": "generic_alternating_5x5_lp",
    "name": "Alternating 5x5 LP",
    "durationWeeks": 2,
    "daysPerWeek": 3,
    "requiredState": [
      {"key": "squat_working_load", "movementId": "squat", "type": "working_load"},
      {"key": "bench_press_working_load", "movementId": "bench_press", "type": "working_load"},
      {"key": "overhead_press_working_load", "movementId": "overhead_press", "type": "working_load"},
      {"key": "deadlift_working_load", "movementId": "deadlift", "type": "working_load"},
      {"key": "barbell_row_working_load", "movementId": "barbell_row", "type": "working_load"}
    ],
    "timelineDescription": "Two-week A/B rotation for three non-consecutive training days per week.",
    "sessions": [
      {
        "id": "day-1",
        "title": "Day 1",
        "estimatedMinutes": 65,
        "slots": [
          {"id": "squat", "role": "main", "movementId": "squat", "prescriptionId": "five-by-five"},
          {"id": "push", "role": "main", "movementId": {"default": "bench_press", "byPhase": {"starts_with_b": "overhead_press"}}, "prescriptionId": "five-by-five"},
          {"id": "pull", "role": "main", "movementId": {"default": "barbell_row", "byPhase": {"starts_with_b": "deadlift"}}, "prescriptionId": "outer-pull"}
        ]
      },
      {
        "id": "day-2",
        "title": "Day 2",
        "estimatedMinutes": 55,
        "slots": [
          {"id": "squat", "role": "main", "movementId": "squat", "prescriptionId": "five-by-five"},
          {"id": "push", "role": "main", "movementId": {"default": "overhead_press", "byPhase": {"starts_with_b": "bench_press"}}, "prescriptionId": "five-by-five"},
          {"id": "pull", "role": "main", "movementId": {"default": "deadlift", "byPhase": {"starts_with_b": "barbell_row"}}, "prescriptionId": "middle-pull"}
        ]
      },
      {
        "id": "day-3",
        "title": "Day 3",
        "estimatedMinutes": 65,
        "slots": [
          {"id": "squat", "role": "main", "movementId": "squat", "prescriptionId": "five-by-five"},
          {"id": "push", "role": "main", "movementId": {"default": "bench_press", "byPhase": {"starts_with_b": "overhead_press"}}, "prescriptionId": "five-by-five"},
          {"id": "pull", "role": "main", "movementId": {"default": "barbell_row", "byPhase": {"starts_with_b": "deadlift"}}, "prescriptionId": "outer-pull"}
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
              {"targetLoad": {"kind": "state", "stateType": "working_load"}, "targetReps": 5, "label": "5"},
              {"targetLoad": {"kind": "state", "stateType": "working_load"}, "targetReps": 5, "label": "5"},
              {"targetLoad": {"kind": "state", "stateType": "working_load"}, "targetReps": 5, "label": "5"},
              {"targetLoad": {"kind": "state", "stateType": "working_load"}, "targetReps": 5, "label": "5"},
              {"targetLoad": {"kind": "state", "stateType": "working_load"}, "targetReps": 5, "label": "5"}
            ]
          },
          "outer-pull": {
            "targetSummary": "5x5 @ current working load",
            "progressionRuleId": "simple_linear_completion",
            "sets": [
              {"targetLoad": {"kind": "state", "stateType": "working_load"}, "targetReps": 5, "label": "5"},
              {"targetLoad": {"kind": "state", "stateType": "working_load"}, "targetReps": 5, "label": "5"},
              {"targetLoad": {"kind": "state", "stateType": "working_load"}, "targetReps": 5, "label": "5"},
              {"targetLoad": {"kind": "state", "stateType": "working_load"}, "targetReps": 5, "label": "5"},
              {"targetLoad": {"kind": "state", "stateType": "working_load"}, "targetReps": 5, "label": "5"}
            ]
          },
          "middle-pull": {
            "targetSummary": "1x5 @ current working load",
            "progressionRuleId": "simple_linear_completion",
            "sets": [
              {"targetLoad": {"kind": "state", "stateType": "working_load"}, "targetReps": 5, "label": "5"}
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
              {"targetLoad": {"kind": "state", "stateType": "working_load"}, "targetReps": 5, "label": "5"},
              {"targetLoad": {"kind": "state", "stateType": "working_load"}, "targetReps": 5, "label": "5"},
              {"targetLoad": {"kind": "state", "stateType": "working_load"}, "targetReps": 5, "label": "5"},
              {"targetLoad": {"kind": "state", "stateType": "working_load"}, "targetReps": 5, "label": "5"},
              {"targetLoad": {"kind": "state", "stateType": "working_load"}, "targetReps": 5, "label": "5"}
            ]
          },
          "outer-pull": {
            "targetSummary": "1x5 @ current working load",
            "progressionRuleId": "simple_linear_completion",
            "sets": [
              {"targetLoad": {"kind": "state", "stateType": "working_load"}, "targetReps": 5, "label": "5"}
            ]
          },
          "middle-pull": {
            "targetSummary": "5x5 @ current working load",
            "progressionRuleId": "simple_linear_completion",
            "sets": [
              {"targetLoad": {"kind": "state", "stateType": "working_load"}, "targetReps": 5, "label": "5"},
              {"targetLoad": {"kind": "state", "stateType": "working_load"}, "targetReps": 5, "label": "5"},
              {"targetLoad": {"kind": "state", "stateType": "working_load"}, "targetReps": 5, "label": "5"},
              {"targetLoad": {"kind": "state", "stateType": "working_load"}, "targetReps": 5, "label": "5"},
              {"targetLoad": {"kind": "state", "stateType": "working_load"}, "targetReps": 5, "label": "5"}
            ]
          }
        }
      }
    ],
    "progressionRules": {
      "main": "simple_linear_completion"
    },
    "progressionConfig": {
      "simple_linear_completion": {
        "increments": {
          "squat": {"kg": 2.5, "lb": 5},
          "bench_press": {"kg": 2.5, "lb": 5},
          "overhead_press": {"kg": 2.5, "lb": 5},
          "deadlift": {"kg": 5, "lb": 10},
          "barbell_row": {"kg": 2.5, "lb": 5}
        }
      }
    }
  }
  $definition$::jsonb)
on conflict (template_id, version) do update set
  definition = excluded.definition;
