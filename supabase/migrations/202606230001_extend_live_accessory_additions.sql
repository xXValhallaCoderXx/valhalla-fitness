alter table public.program_accessory_additions
  alter column source_slot_id drop not null,
  add column if not exists target_summary text,
  add column if not exists sets jsonb not null default '[]'::jsonb,
  add column if not exists note text,
  add column if not exists progression_method text not null default 'history_only'
    check (progression_method in ('history_only', 'double_progression'));

alter table public.exercise_logs
  add column if not exists client_mutation_id text;

create unique index if not exists exercise_logs_user_client_mutation_id_key
  on public.exercise_logs(user_id, client_mutation_id)
  where client_mutation_id is not null;
