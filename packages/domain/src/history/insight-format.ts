import type { HistoryBestSet } from '@sheetless/domain/history/types'
import type { Unit } from '@sheetless/domain/shared/types'
import { externalLoadOrNull, isPositiveLoad } from '@sheetless/domain/shared/load'

export function formatBestSetPrimary(set: HistoryBestSet) {
  const externalLoad = externalLoadOrNull(set.load)
  const load = externalLoad == null ? 'Bodyweight' : `${formatNumber(externalLoad)} ${set.units ?? ''}`.trim()
  const reps = `${set.reps ?? '-'}${set.type === 'amrap' ? '+' : ''}`
  return `${load} × ${reps} reps`
}

export function hasDisplayE1rm(
  set: HistoryBestSet,
): set is HistoryBestSet & { load: number; e1rm: number } {
  return isPositiveLoad(set.load) && isPositiveLoad(set.e1rm)
}

export function formatE1rm(set: HistoryBestSet) {
  return hasDisplayE1rm(set) ? `${formatNumber(set.e1rm)} ${set.units ?? ''}`.trim() : '—'
}

export function formatLoad(value?: number | null, units?: Unit | null) {
  if (!value) return `0 ${units ?? ''}`.trim()
  return `${formatNumber(value)} ${units ?? ''}`.trim()
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value)
}
