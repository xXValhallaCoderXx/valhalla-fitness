import type { DataClient } from '../shared/context'
import type { Unit } from '@sheetless/domain/shared/types'
import { historicalFallbackUnits } from '@sheetless/domain/history/history-units'

/** Match the bounded analytics window without fetching its exercise and set rows. */
export async function getHistoricalFallbackUnits(supabase: DataClient, userId: string): Promise<Unit> {
  const { data, error } = await supabase.from('workout_sessions')
    .select('id, scheduled_date, completed_at, prescription_snapshot')
    .eq('user_id', userId).eq('status', 'completed')
    .order('scheduled_date', { ascending: false })
    .order('completed_at', { ascending: false }).order('id', { ascending: false }).range(0, 239)
  if (error) throw new Error(error.message)
  return historicalFallbackUnits((data ?? []).map(row => {
    const units = (row.prescription_snapshot as { units?: Unit } | null)?.units
    return { id: row.id, scheduledDate: row.scheduled_date ?? '', completedAt: row.completed_at,
      units: units === 'kg' || units === 'lb' ? units : null }
  }))
}
