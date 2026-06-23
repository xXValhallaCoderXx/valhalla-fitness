alter table public.program_accessory_additions
  add column if not exists progression_method text not null default 'history_only'
    check (progression_method in ('history_only', 'double_progression'));
