import type { BodyweightEntry, Sex, StrengthScore, StrengthScoreKind, TotalPoint } from '~/shared/types'
import { parseDate } from '~/domains/history/lib/history'

/**
 * DOTS polynomial coefficients [A, B, C, D, E]:
 * denominator = A + B·bw + C·bw² + D·bw³ + E·bw⁴ (bw in kg); score = totalKg × 500 / denominator.
 */
export const DOTS_COEFFICIENTS: Record<Sex, [number, number, number, number, number]> = {
  male: [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -0.000001093],
  female: [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -0.0000010706],
}

/** Bodyweight is clamped into this [min, max] kg range before evaluating the polynomial. */
export const DOTS_BW_CLAMP_KG: Record<Sex, [number, number]> = {
  male: [40, 210],
  female: [40, 150],
}

export const strengthScoreKindLabels: Record<StrengthScoreKind, string> = {
  dots: 'DOTS',
  bw_multiple: '× bodyweight',
  total: 'Total',
  insufficient: 'Not enough data',
}

export function dotsScore(totalKg: number, bodyweightKg: number, sex: Sex): number {
  if (totalKg <= 0 || bodyweightKg <= 0) return 0
  const [min, max] = DOTS_BW_CLAMP_KG[sex]
  const bw = Math.min(max, Math.max(min, bodyweightKg))
  const [a, b, c, d, e] = DOTS_COEFFICIENTS[sex]
  const denominator = a + b * bw + c * bw ** 2 + d * bw ** 3 + e * bw ** 4
  return Math.round(((totalKg * 500) / denominator) * 10) / 10
}

export function bodyweightMultiple(totalKg: number, bodyweightKg: number): number {
  if (totalKg <= 0 || bodyweightKg <= 0) return 0
  return Math.round((totalKg / bodyweightKg) * 100) / 100
}

const MS_PER_DAY = 86_400_000

/** Day index of an ISO date/timestamp at calendar-day precision (UTC), for delta comparison. */
function dayIndex(iso: string): number | null {
  const date = parseDate(iso.slice(0, 10))
  return date ? Math.floor(date.getTime() / MS_PER_DAY) : null
}

/**
 * Nearest entry to `isoDate` by absolute day delta; ties prefer the earlier
 * entry (entries are sorted ascending by recordedOn).
 */
export function nearestBodyweight(entries: BodyweightEntry[], isoDate: string): BodyweightEntry | null {
  const target = dayIndex(isoDate)
  if (target == null) return null
  let best: BodyweightEntry | null = null
  let bestDelta = Infinity
  for (const entry of entries) {
    const day = dayIndex(entry.recordedOn)
    if (day == null) continue
    const delta = Math.abs(day - target)
    if (delta < bestDelta) {
      best = entry
      bestDelta = delta
    }
  }
  return best
}

export function decorateTotalPoints(
  points: Array<Pick<TotalPoint, 'date' | 'total' | 'totalKg'>>,
  entries: BodyweightEntry[],
  sex: Sex | null,
): TotalPoint[] {
  return points.map((point) => {
    const bodyweightKg = nearestBodyweight(entries, point.date)?.weightKg ?? null
    return {
      ...point,
      bodyweightKg,
      dots: bodyweightKg != null && sex != null ? dotsScore(point.totalKg, bodyweightKg, sex) : null,
      bwMultiple: bodyweightKg != null ? bodyweightMultiple(point.totalKg, bodyweightKg) : null,
    }
  })
}

/** Fallback chain: dots → bw_multiple → total → insufficient, by available inputs. */
export function resolveStrengthScore(input: {
  total: number | null
  totalKg: number | null
  bodyweightKg: number | null
  sex: Sex | null
  asOfDate: string | null
}): StrengthScore {
  const { total, totalKg, bodyweightKg, sex, asOfDate } = input
  const base = { total, totalKg, bodyweightKg, asOfDate }
  const hasTotal = totalKg != null && totalKg > 0
  const hasBodyweight = bodyweightKg != null && bodyweightKg > 0
  if (hasTotal && hasBodyweight && sex != null) {
    return { kind: 'dots', value: dotsScore(totalKg, bodyweightKg, sex), ...base }
  }
  if (hasTotal && hasBodyweight) {
    return { kind: 'bw_multiple', value: bodyweightMultiple(totalKg, bodyweightKg), ...base }
  }
  if (hasTotal) {
    return { kind: 'total', value: total, ...base }
  }
  return { kind: 'insufficient', value: null, ...base }
}
