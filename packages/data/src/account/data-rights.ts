import type { z } from 'zod'
import {
  ACCOUNT_DELETE_CONFIRMATION,
  ACCOUNT_EXPORT_SCHEMA_VERSION,
  buildAccountExportIdentity,
  deleteAccountInputSchema,
  isAccountDeleteConfirmed,
} from '@sheetless/domain/account/data-rights'
import type { Database } from '@sheetless/domain/shared/types'
import type { UserContext } from '../shared/context'

type Tables = Database['public']['Tables']
type TableRow<Name extends keyof Tables> = Tables[Name] extends { Row: infer Row } ? Row : never

type PageResponse<Row> = {
  data: Row[] | null
  error: { message: string } | null
}

type PageReader<Row> = (from: number, to: number) => PromiseLike<PageResponse<Row>>

const EXPORT_PAGE_SIZE = 1_000

async function readAllRows<Row>(readPage: PageReader<Row>): Promise<Row[]> {
  const rows: Row[] = []

  for (let from = 0; ; from += EXPORT_PAGE_SIZE) {
    const { data, error } = await readPage(from, from + EXPORT_PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    const page = data ?? []
    rows.push(...page)
    if (page.length < EXPORT_PAGE_SIZE) return rows
  }
}

export async function exportAccountData(ctx: UserContext) {
  const { supabase, user } = ctx

  const [
    profiles,
    bodyweightEntries,
    feedbackEvents,
    programTemplates,
    programInstances,
    programStateValues,
    programMovementOverrides,
    programAccessoryAdditions,
    programEquipmentModeChoices,
    programReturnPeriods,
    programLoadOverrides,
    programLoadAdjustments,
    workoutSessions,
    exerciseLogs,
    setLogs,
    substitutionLogs,
    progressionDecisions,
    sessionProgramChangeJournal,
  ] = await Promise.all([
    readAllRows<TableRow<'profiles'>>((from, to) =>
      supabase.from('profiles').select('*').eq('id', user.id).order('id').range(from, to),
    ),
    readAllRows<TableRow<'bodyweight_entries'>>((from, to) =>
      supabase.from('bodyweight_entries').select('*').eq('user_id', user.id).order('id').range(from, to),
    ),
    readAllRows<TableRow<'feedback_events'>>((from, to) =>
      supabase.from('feedback_events').select('*').eq('user_id', user.id).order('id').range(from, to),
    ),
    readAllRows<TableRow<'program_templates'>>((from, to) =>
      supabase.from('program_templates').select('*').eq('created_by', user.id).order('id').range(from, to),
    ),
    readAllRows<TableRow<'program_instances'>>((from, to) =>
      supabase.from('program_instances').select('*').eq('user_id', user.id).order('id').range(from, to),
    ),
    readAllRows<TableRow<'program_state_values'>>((from, to) =>
      supabase.from('program_state_values').select('*').eq('user_id', user.id).order('id').range(from, to),
    ),
    readAllRows<TableRow<'program_movement_overrides'>>((from, to) =>
      supabase.from('program_movement_overrides').select('*').eq('user_id', user.id).order('id').range(from, to),
    ),
    readAllRows<TableRow<'program_accessory_additions'>>((from, to) =>
      supabase.from('program_accessory_additions').select('*').eq('user_id', user.id).order('id').range(from, to),
    ),
    readAllRows<TableRow<'program_equipment_mode_choices'>>((from, to) =>
      supabase.from('program_equipment_mode_choices').select('*').eq('user_id', user.id).order('id').range(from, to),
    ),
    readAllRows<TableRow<'program_return_periods'>>((from, to) =>
      supabase.from('program_return_periods').select('*').eq('user_id', user.id).order('id').range(from, to),
    ),
    readAllRows<TableRow<'program_load_overrides'>>((from, to) =>
      supabase.from('program_load_overrides').select('*').eq('user_id', user.id).order('id').range(from, to),
    ),
    readAllRows<TableRow<'program_load_adjustments'>>((from, to) =>
      supabase.from('program_load_adjustments').select('*').eq('user_id', user.id).order('id').range(from, to),
    ),
    readAllRows<TableRow<'workout_sessions'>>((from, to) =>
      supabase.from('workout_sessions').select('*').eq('user_id', user.id).order('id').range(from, to),
    ),
    readAllRows<TableRow<'exercise_logs'>>((from, to) =>
      supabase.from('exercise_logs').select('*').eq('user_id', user.id).order('id').range(from, to),
    ),
    readAllRows<TableRow<'set_logs'>>((from, to) =>
      supabase.from('set_logs').select('*').eq('user_id', user.id).order('id').range(from, to),
    ),
    readAllRows<TableRow<'substitution_logs'>>((from, to) =>
      supabase.from('substitution_logs').select('*').eq('user_id', user.id).order('id').range(from, to),
    ),
    readAllRows<TableRow<'progression_decisions'>>((from, to) =>
      supabase.from('progression_decisions').select('*').eq('user_id', user.id).order('id').range(from, to),
    ),
    readAllRows<TableRow<'session_program_change_journal'>>((from, to) =>
      supabase.from('session_program_change_journal').select('*').eq('user_id', user.id).order('id').range(from, to),
    ),
  ])

  const templateIds = programTemplates.map((template) => template.id)
  const templateIdChunks = Array.from(
    { length: Math.ceil(templateIds.length / 100) },
    (_, index) => templateIds.slice(index * 100, index * 100 + 100),
  )
  const programTemplateVersions = (
    await Promise.all(
      templateIdChunks.map((templateIdChunk) =>
        readAllRows<TableRow<'program_template_versions'>>((from, to) =>
          supabase
            .from('program_template_versions')
            .select('*')
            .in('template_id', templateIdChunk)
            .order('id')
            .range(from, to),
        ),
      ),
    )
  ).flat()

  return {
    schemaVersion: ACCOUNT_EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    account: buildAccountExportIdentity(user),
    data: {
      profiles,
      bodyweight_entries: bodyweightEntries,
      feedback_events: feedbackEvents,
      program_templates: programTemplates,
      program_template_versions: programTemplateVersions,
      program_instances: programInstances,
      program_state_values: programStateValues,
      program_movement_overrides: programMovementOverrides,
      program_accessory_additions: programAccessoryAdditions,
      program_equipment_mode_choices: programEquipmentModeChoices,
      program_return_periods: programReturnPeriods,
      program_load_overrides: programLoadOverrides,
      program_load_adjustments: programLoadAdjustments,
      workout_sessions: workoutSessions,
      exercise_logs: exerciseLogs,
      set_logs: setLogs,
      substitution_logs: substitutionLogs,
      progression_decisions: progressionDecisions,
      session_program_change_journal: sessionProgramChangeJournal,
    },
  }
}

export async function deleteOwnAccount(
  ctx: UserContext,
  data: z.infer<typeof deleteAccountInputSchema>,
) {
  const parsed = deleteAccountInputSchema.safeParse(data)
  if (!parsed.success) {
    const candidate: unknown = data
    const confirmation = typeof candidate === 'object' && candidate !== null && 'confirmation' in candidate
      ? (candidate as { confirmation?: unknown }).confirmation
      : null
    if (typeof confirmation !== 'string' || !isAccountDeleteConfirmed(confirmation)) {
      throw new Error(`Enter ${ACCOUNT_DELETE_CONFIRMATION} exactly to delete your account.`)
    }
    throw parsed.error
  }
  const { error } = await ctx.supabase.rpc('delete_own_account', {
    p_confirmation: parsed.data.confirmation,
  })
  if (error) throw new Error(error.message)

  return { ok: true } as const
}
