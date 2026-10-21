import type { z } from 'zod'
import {
  bodyweightLogInputSchema,
  deleteBodyweightEntryInputSchema,
} from '@sheetless/domain/account/schemas'
import { normalizeBodyweightLog } from '@sheetless/domain/account/bodyweight'
import type { BodyweightEntry } from '@sheetless/domain/account/types'
import type { UserContext } from '../shared/context'

type BodyweightRow = { id: string; recorded_on: string; weight_kg: number }
const BODYWEIGHT_PAGE_SIZE = 1_000

function entryFromRow(row: BodyweightRow): BodyweightEntry {
  return { id: row.id, recordedOn: row.recorded_on, weightKg: Number(row.weight_kg) }
}

export async function getBodyweightEntries(ctx: UserContext): Promise<BodyweightEntry[]> {
  const { supabase, user } = ctx
  const entries: BodyweightEntry[] = []
  for (let from = 0; ; from += BODYWEIGHT_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('bodyweight_entries')
      .select('id, recorded_on, weight_kg')
      .eq('user_id', user.id)
      .order('recorded_on', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + BODYWEIGHT_PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    const page = (data ?? []) as BodyweightRow[]
    entries.push(...page.map(entryFromRow))
    if (page.length < BODYWEIGHT_PAGE_SIZE) return entries
  }
}

export async function logBodyweight(
  ctx: UserContext,
  data: z.infer<typeof bodyweightLogInputSchema>,
): Promise<BodyweightEntry> {
  const { supabase, user } = ctx
  const parsed = bodyweightLogInputSchema.parse(data)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', user.id)
    .single()
  if (profileError) throw new Error(profileError.message)
  const { recordedOn, weightKg } = normalizeBodyweightLog(
    parsed,
    new Date().toISOString(),
    profile.timezone,
  )
  const { data: row, error } = await supabase
    .from('bodyweight_entries')
    .upsert(
      { user_id: user.id, recorded_on: recordedOn, weight_kg: weightKg },
      { onConflict: 'user_id,recorded_on' },
    )
    .select('id, recorded_on, weight_kg')
    .single()
  if (error) throw new Error(error.message)
  return entryFromRow(row as BodyweightRow)
}

export async function deleteBodyweightEntry(
  ctx: UserContext,
  data: z.infer<typeof deleteBodyweightEntryInputSchema>,
) {
  const { supabase, user } = ctx
  const parsed = deleteBodyweightEntryInputSchema.parse(data)
  const { error } = await supabase
    .from('bodyweight_entries')
    .delete()
    .eq('id', parsed.id)
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)
  return { ok: true as const }
}
