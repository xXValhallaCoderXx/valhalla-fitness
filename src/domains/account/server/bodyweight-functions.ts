import { createServerFn } from '@tanstack/react-start'
import type { BodyweightEntry, Unit } from '~/shared/types'
import { convertLoad } from '~/domains/history/lib/history'

async function requireUser() {
  const { requireUser } = await import('~/shared/server/require-user')
  return requireUser()
}

export type BodyweightLogInput = {
  weight: number
  unit: Unit
  /** Calendar date (YYYY-MM-DD); defaults to the server's current UTC date. */
  recordedOn?: string
}

/** Plausibility bounds for a human bodyweight, exclusive, in canonical kg. */
export const bodyweightBoundsKg = { min: 20, max: 500 }

/**
 * Pure normalization for a bodyweight log: converts the entered weight to
 * canonical kg and resolves the calendar date. Throws user-facing messages
 * (surfaced verbatim by the form) for implausible weights or malformed dates.
 * `now` is an ISO timestamp injected by the caller so the default date is testable.
 */
export function normalizeBodyweightLog(input: BodyweightLogInput, now: string): { recordedOn: string; weightKg: number } {
  const weightKg = convertLoad(input.weight, input.unit, 'kg')
  if (!Number.isFinite(weightKg) || weightKg <= bodyweightBoundsKg.min || weightKg >= bodyweightBoundsKg.max) {
    throw new Error('That bodyweight looks unlikely — enter a weight between 20 and 500 kg (about 44 and 1100 lb).')
  }
  const recordedOn = input.recordedOn ?? new Date(now).toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(recordedOn) || Number.isNaN(Date.parse(recordedOn))) {
    throw new Error('Use a calendar date in YYYY-MM-DD format.')
  }
  return { recordedOn, weightKg }
}

type BodyweightRow = { id: string; recorded_on: string; weight_kg: number }

function entryFromRow(row: BodyweightRow): BodyweightEntry {
  return { id: row.id, recordedOn: row.recorded_on, weightKg: Number(row.weight_kg) }
}

export const getBodyweightEntriesFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<BodyweightEntry[]> => {
    const { supabase, user } = await requireUser()
    const { data, error } = await supabase
      .from('bodyweight_entries')
      .select('id, recorded_on, weight_kg')
      .eq('user_id', user.id)
      .order('recorded_on', { ascending: true })
    if (error) throw new Error(error.message)
    return ((data ?? []) as BodyweightRow[]).map(entryFromRow)
  },
)

export const logBodyweightFn = createServerFn({ method: 'POST' })
  .validator((data: BodyweightLogInput) => data)
  .handler(async ({ data }): Promise<BodyweightEntry> => {
    const { supabase, user } = await requireUser()
    const { recordedOn, weightKg } = normalizeBodyweightLog(data, new Date().toISOString())
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
  })

export const deleteBodyweightEntryFn = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser()
    const { error } = await supabase.from('bodyweight_entries').delete().eq('id', data.id).eq('user_id', user.id)
    if (error) throw new Error(error.message)
    return { ok: true as const }
  })
