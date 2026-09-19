import type { ExperienceMode } from '@sheetless/domain/account/types'
import type { E1rmPoint } from '@sheetless/domain/history/types'
import type { Unit } from '@sheetless/domain/shared/types'
import { formatDayMonth } from '@sheetless/domain/shared/dates'
import { formatWeight } from '@sheetless/domain/shared/set-notation'

export type LiftStatKey = 'current' | 'heaviest' | 'training_max' | 'change'

export type LiftStat = {
  key: LiftStatKey
  label: string
  value: string
  /** Where the figure came from; null when there is nothing to attribute it to. */
  detail: string | null
}

/**
 * The four figures that answer "is this lift going up".
 *
 * A cell with nothing behind it is **omitted**, not em-dashed — a lift with no training max should
 * render a three-cell strip rather than a fourth column of nothing.
 *
 * The first cell keeps saying "e1RM" in both modes. That is notation, and Guided normally avoids it,
 * but it is the shipped label and the one a lifter has already learned on this screen.
 */
export function buildLiftStats({
  points,
  trainingMax,
  units,
  mode,
  staleWelcomeBack = false,
}: {
  /** Already sliced to the visible range. */
  points: E1rmPoint[]
  trainingMax: { value: number; updatedAt?: string | null; changedBy?: number | null } | null
  units: Unit | null
  mode: ExperienceMode
  /** After a long gap the latest reading is history, so lead with the best instead. */
  staleWelcomeBack?: boolean
}): LiftStat[] {
  const clean = points.filter((point) => !point.outlier)
  const best = clean.reduce<E1rmPoint | null>((top, point) => (!top || point.e1rm > top.e1rm ? point : top), null)
  const heaviest = clean.reduce<E1rmPoint | null>((top, point) => (!top || point.load > top.load ? point : top), null)
  const latest = clean[clean.length - 1] ?? null
  const first = clean[0] ?? null
  const lead = staleWelcomeBack ? best : latest

  const stats: LiftStat[] = []

  stats.push({
    key: 'current',
    label: staleWelcomeBack ? 'Best e1RM' : 'Current e1RM',
    value: lead ? weight(lead.e1rm, units) : '—',
    detail: lead ? setLine(lead, units) : null,
  })

  if (heaviest) {
    stats.push({
      key: 'heaviest',
      label: mode === 'full' ? 'Heaviest set' : 'Heaviest lift',
      value: `${weight(heaviest.load, units)} × ${heaviest.reps}`,
      detail: [
        formatDayMonth(heaviest.date),
        heaviest.rir === null ? null : `RIR ${heaviest.rir}`,
        // Units are already on the value beside it; repeating them reads as a second figure.
        `e1RM ${round(heaviest.e1rm)}`,
      ]
        .filter(Boolean)
        .join(' · '),
    })
  }

  if (trainingMax) {
    const reference = best?.e1rm ?? 0
    stats.push({
      key: 'training_max',
      label: mode === 'full' ? 'Training max' : 'Training weight',
      value: weight(trainingMax.value, units),
      detail: [
        reference > 0 ? `${Math.round((trainingMax.value / reference) * 100)} % of e1RM` : null,
        trainingMax.changedBy && trainingMax.updatedAt
          ? `${trainingMax.changedBy > 0 ? '+' : ''}${round(trainingMax.changedBy)} on ${formatDayMonth(trainingMax.updatedAt)}`
          : null,
      ]
        .filter(Boolean)
        .join(' · ') || null,
    })
  }

  // One session is a reading, not a change.
  if (first && latest && first !== latest) {
    const change = round(latest.e1rm - first.e1rm)
    stats.push({
      key: 'change',
      label: 'Change in range',
      value: `${change > 0 ? '+' : ''}${weight(change, units)}${mode === 'full' ? ' e1RM' : ''}`,
      detail: `${round(first.e1rm)} → ${round(latest.e1rm)} · ${formatDayMonth(first.date)} – ${formatDayMonth(latest.date)}`,
    })
  }

  return stats
}

/** "22 Jul · 167.5 kg × 5 @ RIR 2" — the set the estimate came off. */
function setLine(point: E1rmPoint, units: Unit | null): string {
  const rir = point.rir === null ? '' : ` @ RIR ${point.rir}`
  return `${formatDayMonth(point.date)} · ${weight(point.load, units)} × ${point.reps}${rir}`
}

function weight(value: number, units: Unit | null): string {
  return formatWeight(value, units) ?? '—'
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}
