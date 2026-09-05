/* global console, process */

import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const failures = []

function read(path) {
  return readFileSync(resolve(path), 'utf8')
}

function sourceFilesUnder(path) {
  return readdirSync(resolve(path), { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name)
    if (entry.isDirectory()) return sourceFilesUnder(child)
    return /\.(?:ts|tsx)$/.test(entry.name) ? [child] : []
  })
}

function requireFragments(path, fragments) {
  const contents = read(path)
  for (const fragment of fragments) {
    if (!contents.includes(fragment)) {
      failures.push(`${path} is missing required contract: ${fragment}`)
    }
  }
  return contents
}

const foundations = requireFragments(
  'supabase/migrations/202607280001_release_integrity_foundations.sql',
  [
    'program_instances_one_active_per_user_idx',
    'workout_sessions_one_in_progress_per_user_idx',
    'workout_sessions_user_client_mutation_id_idx',
    'set_logs_user_client_mutation_id_idx',
    'add column if not exists state_version integer not null default 0',
    'add column if not exists finish_payload_hash text',
    'workout_sessions_finish_payload_hash_format_check',
    'workout_sessions_state_version_nonnegative_check',
    'session_mutation_receipts',
    'resulting_state_version',
    'payload_hash',
    'on delete cascade',
    'revoke all on table public.session_mutation_receipts',
    'drop constraint if exists workout_sessions_client_mutation_id_key',
    'drop constraint if exists set_logs_client_mutation_id_key',
    'program_instances_template_version_matches_template_fkey',
    'workout_sessions_source_owner_fkey',
    'set_logs_exercise_owner_fkey',
    'protect_pinned_template_version',
    'DISCARD_NOT_RESTORE_SAFE',
    'SET_SESSION_MISMATCH',
  ],
)

const lifecycle = requireFragments(
  'supabase/migrations/202607280002_lifecycle_rpcs_v2.sql',
  [
    'start_program_v2',
    'start_session_v2',
    'start_ad_hoc_session_v2',
    'finish_session_v2',
    'resolve_progression_decisions_v2',
    'pg_advisory_xact_lock',
    'v_program_state_version <> p_expected_program_version',
    'PENDING_PROGRESSION_DECISIONS',
    "status = 'superseded'",
    "jsonb_typeof(p_prescription_snapshot->'movements') is distinct from 'array'",
    "jsonb_typeof(v_exercise->'sets') is distinct from 'array'",
    'version.definition_checksum = p_definition_checksum',
    'for share of template, version',
    'p_start_date date',
    'p_expected_session_version integer',
    'finish_payload_hash = v_payload_hash',
    'alter default privileges in schema public',
  ],
)
const finishPayloadHash =
  lifecycle.match(
    /create function public\.finish_session_v2[\s\S]*?v_payload_hash := md5\([\s\S]*?\n {2}\)::text\);/,
  )?.[0] ?? ''
if (finishPayloadHash.includes("'prs'") || finishPayloadHash.includes("'decisions'")) {
  failures.push('Finish idempotency must hash stable user intent, not server-derived PRs or decisions')
}

const atomicSessionMutations = requireFragments(
  'supabase/migrations/202607280003_atomic_session_mutations.sql',
  [
    'exercise_logs_user_created_idx',
    'substitution_logs_user_session_created_idx',
    'claim_session_mutation_v2',
    'complete_session_mutation_v2',
    'rename_session_v2',
    'upsert_session_set_v2',
    'add_session_accessory_v2',
    'reorder_session_accessories_v2',
    'remove_session_accessory_v2',
    'add_ad_hoc_exercise_v2',
    'remove_ad_hoc_exercise_v2',
    'add_session_set_v2',
    'substitute_session_movement_v2',
    'IDEMPOTENCY_CONFLICT',
    'v_payload_hash := md5(p_intent::text)',
    'resulting_state_version',
    'state_version = state_version + 1',
    'pg_advisory_xact_lock',
    'validate_session_snapshot_v2',
    'session_set_program_movement_override(uuid, text, text, text, text, text, uuid, boolean)',
    'session_insert_program_accessory_addition(uuid, text, text, text, text, text, text, jsonb, text, text, integer)',
  ],
)
if (atomicSessionMutations.includes("errcode = '23505'")) {
  failures.push('Atomic session mutations must not treat a generic unique violation as a replay')
}

requireFragments(
  'supabase/migrations/202607280004_account_self_service_delete.sql',
  [
    'delete_own_account',
    'auth.uid()',
    'from public.profiles',
    'delete from auth.users',
    'set search_path =',
  ],
)

const writeBoundary = requireFragments(
  'supabase/migrations/202607280005_lifecycle_write_boundary.sql',
  [
    'set_session_favorite_v2',
    'advance_program_position_v2',
    'create_custom_program_template_v2',
    'pg_advisory_xact_lock',
    'PROGRAM_POSITION_REGRESSION',
    'TEMPLATE_DEFINITION_MISMATCH',
    "p_definition ? 'progressionRules'",
    "'custom-' || left(v_user_id::text, 8)",
    "jsonb_array_length(p_definition->'sessions') <> v_days_per_week",
    'exercise_logs_user_planned_created_idx',
    'exercise_logs_user_performed_created_idx',
    'exercise_logs_user_session_order_idx',
    'workout_sessions_user_program_status_scheduled_idx',
    'revoke insert, update, delete on table',
    'public.session_program_change_journal',
    'grant execute on function public.set_session_favorite_v2',
    'grant execute on function public.advance_program_position_v2',
    'grant execute on function public.create_custom_program_template_v2',
  ],
)

requireFragments(
  'supabase/migrations/202607300006_equipment_mode_foundations.sql',
  [
    'equipment_mode_policy_versions',
    'program_equipment_mode_choices',
    'equipment_mode text not null default',
    'free_weight_policy_version_id',
    'free_weight_choices_hash',
    'protect_referenced_equipment_mode_policy_version',
    'before update or delete on public.equipment_mode_policy_versions',
  ],
)

requireFragments(
  'supabase/migrations/202607300007_equipment_mode_lifecycle.sql',
  [
    'normalize_free_weight_choices_v1',
    'validate_free_weight_choice_completeness_v1',
    'start_program_v3',
    'set_program_equipment_mode_v1',
    'validate_program_equipment_snapshot_v1',
    'enforce_program_equipment_snapshot',
    'WORKOUT_IN_PROGRESS',
    'FREE_WEIGHT_CHOICE_STALE',
    "replacement.resistance_mode not in (\n          'barbell', 'dumbbell', 'specialty_bar', 'bodyweight'",
    'before insert or update of program_instance_id, prescription_snapshot',
  ],
)

requireFragments(
  'supabase/migrations/202607300008_expand_movement_catalog.sql',
  [
    'free-weight-v1-leg_extension',
    "'00000000-0000-4000-8000-000000000201'",
    "where status = 'active'",
    "where status = 'deprecated'",
    'MOVEMENT_CATALOG_INCOMPLETE',
  ],
)

const databaseTypes = requireFragments('packages/domain/src/shared/types/database.ts', [
  'advance_program_position_v2:',
  'create_custom_program_template_v2:',
  'delete_own_account:',
  'set_session_favorite_v2:',
  'start_program_v2:',
  'start_program_v3:',
  'set_program_equipment_mode_v1:',
  'start_session_v2:',
  'start_ad_hoc_session_v2:',
  'finish_session_v2:',
  'p_expected_session_version: number',
  'p_intent: Json',
  'resolve_progression_decisions_v2:',
  'upsert_session_set_v2:',
  'rename_session_v2:',
  'add_session_accessory_v2:',
  'reorder_session_accessories_v2:',
  'remove_session_accessory_v2:',
  'add_ad_hoc_exercise_v2:',
  'remove_ad_hoc_exercise_v2:',
  'add_session_set_v2:',
  'substitute_session_movement_v2:',
  'session_mutation_receipts:',
  'equipment_mode_policy_versions:',
  'program_equipment_mode_choices:',
  'state_version: number',
  'p_start_date: string',
])

for (const path of [
  'supabase/migrations/202607280001_release_integrity_foundations.sql',
  'packages/domain/src/shared/types/database.ts',
  'packages/data/src/account/data-rights.ts',
  'apps/web/scripts/audit-release-integrity.mjs',
]) {
  if (read(path).includes('program_anchors')) {
    failures.push(`${path} references retired program_anchors storage`)
  }
}

const programStartServer = requireFragments(
  'packages/data/src/program/start.ts',
  [
    "supabase.rpc('start_program_v3'",
  ],
)
requireFragments(
  'packages/data/src/program/equipment-mode.ts',
  [
    "supabase.rpc('set_program_equipment_mode_v1'",
    'expectedStateVersion',
    'FREE_WEIGHT_POLICY_STALE',
  ],
)
const activeProgramServer = requireFragments(
  'packages/data/src/program/active-program.ts',
  [
    'advance_program_position_v2',
    'resolve_progression_decisions_v2',
  ],
)
const programTemplateData = requireFragments(
  'packages/data/src/program/template-data.ts',
  [
    "throw new Error('PINNED_TEMPLATE_INVALID')",
  ],
)
const programServer = `${programStartServer}\n${activeProgramServer}\n${programTemplateData}`
if (programServer.includes('?? crypto.randomUUID()')) {
  failures.push('Programme lifecycle handlers must receive stable request IDs from callers')
}

const sessionLifecycleServer = requireFragments(
  'packages/data/src/session/lifecycle.ts',
  [
    "supabase.rpc('start_session_v3'",
    "supabase.rpc('start_ad_hoc_session_v2'",
    "supabase.rpc('rename_session_v2'",
  ],
)
const sessionCompletionServer = requireFragments(
  'packages/data/src/session/completion.ts',
  [
    "supabase.rpc('finish_session_v3'",
  ],
)
const sessionSetServer = requireFragments(
  'packages/data/src/session/sets.ts',
  [
    "supabase.rpc('upsert_session_set_v2'",
    "supabase.rpc('add_session_set_v2'",
  ],
)
const sessionAccessoryServer = requireFragments(
  'packages/data/src/session/accessories.ts',
  [
    "supabase.rpc('add_session_accessory_v2'",
    "supabase.rpc('reorder_session_accessories_v2'",
    "supabase.rpc('remove_session_accessory_v2'",
  ],
)
const sessionAdHocServer = requireFragments(
  'packages/data/src/session/ad-hoc-exercises.ts',
  [
    "supabase.rpc('add_ad_hoc_exercise_v2'",
    "supabase.rpc('remove_ad_hoc_exercise_v2'",
  ],
)
const sessionMovementServer = requireFragments(
  'packages/data/src/session/movements.ts',
  [
    "supabase.rpc('substitute_session_movement_v2'",
  ],
)
const sessionServer = [
  sessionLifecycleServer,
  sessionCompletionServer,
  sessionSetServer,
  sessionAccessoryServer,
  sessionAdHocServer,
  sessionMovementServer,
].join('\n')
if (sessionServer.includes('23505') || sessionServer.includes('unique_violation')) {
  failures.push('Session handlers must use durable receipts, not generic uniqueness as replay detection')
}
for (const legacyRpc of [
  'session_set_program_movement_override',
  'session_insert_program_accessory_addition',
  'session_reorder_program_accessory_additions',
  'session_remove_program_accessory_addition',
]) {
  if (sessionServer.includes(`rpc('${legacyRpc}'`)) {
    failures.push(`Session handlers must not bypass atomic wrappers through ${legacyRpc}`)
  }
}

const favoriteServer = requireFragments(
  'packages/data/src/session/favorites.ts',
  ["supabase.rpc('set_session_favorite_v2'"],
)
const lifecycleWriteSources = sourceFilesUnder('apps/web/src/domains')
  .map(read)
  .join('\n')
const lifecycleTablePattern = [
  'program_templates',
  'program_template_versions',
  'program_instances',
  'program_state_values',
  'program_movement_overrides',
  'program_accessory_additions',
  'workout_sessions',
  'exercise_logs',
  'set_logs',
  'substitution_logs',
  'progression_decisions',
  'session_program_change_journal',
].join('|')
const directLifecycleWrite = new RegExp(
  String.raw`\.from\(['"](?:${lifecycleTablePattern})['"]\)[\s\S]{0,240}?\.(?:insert|update|delete|upsert)\(`,
)
if (directLifecycleWrite.test(lifecycleWriteSources)) {
  failures.push('Application lifecycle tables must be mutated only through guarded RPCs')
}

const pinnedLoader =
  programTemplateData.match(
    /async function getPinnedTemplateDefinition[\s\S]*?(?=async function getLatestTemplateVersion)/,
  )?.[0] ?? ''
if (pinnedLoader.includes('getFallbackTemplateDefinition')) {
  failures.push('Pinned template loading must fail closed instead of using a code fallback')
}

for (const [name, contents] of [
  ['release foundations', foundations],
  ['lifecycle RPCs', lifecycle],
  ['atomic session mutations', atomicSessionMutations],
  ['lifecycle write boundary', writeBoundary],
  ['database types', databaseTypes],
  ['program server', programServer],
  ['session server', sessionServer],
  ['favorite server', favoriteServer],
]) {
  if (!contents.trim()) failures.push(`${name} contract file is empty`)
}

// Guided-return lifecycle and append-only reset provenance.
requireFragments('supabase/migrations/202609060001_program_return_foundation.sql', [
  'program_return_periods', 'program_load_overrides', 'program_load_adjustments',
  'pg_advisory_xact_lock', 'IDEMPOTENCY_CONFLICT', 'superseded_decision_ids',
])
requireFragments('supabase/migrations/202609060002_program_return_protocol.sql', [
  'program_return_targets_v1', 'RETURN_CLIENT_UPDATE_REQUIRED', 'RETURN_CONTEXT_IMMUTABLE',
])
requireFragments('supabase/migrations/202609060003_program_return_finish.sql', [
  'RETURN_PROGRESSION_CAP_INVALID', 'RETURN_INCREASE_NOT_EARNED', 'completed_workouts+1',
])

if (failures.length > 0) {
  console.error('Database contract verification failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Database contract verification passed')
