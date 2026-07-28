import { createServerFn } from '@tanstack/react-start'
import {
  ACCOUNT_DELETE_CONFIRMATION,
  ACCOUNT_EXPORT_SCHEMA_VERSION,
  buildAccountExportIdentity,
  deleteAccountInputSchema,
  isAccountDeleteConfirmed,
} from '~/domains/account/lib/data-rights'
import type { Database } from '~/shared/types/database'

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

async function requireUser() {
  const { requireUser } = await import('~/shared/server/require-user')
  return requireUser()
}

export const exportAccountDataFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabase, user } = await requireUser()

  const [
    profiles,
    bodyweightEntries,
    feedbackEvents,
    programTemplates,
    programInstances,
    programStateValues,
    programMovementOverrides,
    programAccessoryAdditions,
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
      workout_sessions: workoutSessions,
      exercise_logs: exerciseLogs,
      set_logs: setLogs,
      substitution_logs: substitutionLogs,
      progression_decisions: progressionDecisions,
      session_program_change_journal: sessionProgramChangeJournal,
    },
  }
})

export const deleteOwnAccountFn = createServerFn({ method: 'POST' })
  .validator((data) => deleteAccountInputSchema.parse(data))
  .handler(async ({ data }) => {
    if (!isAccountDeleteConfirmed(data.confirmation)) {
      throw new Error(`Enter ${ACCOUNT_DELETE_CONFIRMATION} exactly to delete your account.`)
    }

    const { supabase } = await requireUser()
    const { error } = await supabase.rpc('delete_own_account', {
      p_confirmation: data.confirmation,
    })
    if (error) throw new Error(error.message)

    return { ok: true } as const
  })
