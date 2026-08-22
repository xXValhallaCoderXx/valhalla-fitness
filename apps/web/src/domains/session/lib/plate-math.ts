import type { Unit } from '~/shared/types'

/** Standard per-side plate set for each unit system (the solver sorts heaviest-first). */
export const PLATE_INVENTORY: Record<Unit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
}

/** Standard Olympic barbell weight per unit system. */
export const DEFAULT_BAR_WEIGHT: Record<Unit, number> = {
  kg: 20,
  lb: 45,
}

export type PlateStack = {
  target: number
  barWeight: number
  /** Plates for ONE side of the bar, heaviest first. */
  perSide: number[]
  /** Total weight actually loadable with the available plates (≤ target). */
  nearestLoadable: number
  /** Per-side weight that could not be matched by the available plates (0 when exact). */
  leftoverPerSide: number
}

const EPS = 1e-6

function round2(value: number) {
  return Math.round(value * 100) / 100
}

/**
 * Greedy per-side plate breakdown for a barbell target. Rounds DOWN to the nearest weight the
 * available plates can build (like Alpha Progression), reporting any per-side remainder so the
 * UI can flag "nearest loadable". Pure — safe to unit-test.
 */
export function computePlateStack({
  target,
  barWeight,
  units,
  inventory,
}: {
  target: number
  barWeight: number
  units: Unit
  inventory?: number[]
}): PlateStack {
  const plates = (inventory ?? PLATE_INVENTORY[units]).slice().sort((left, right) => right - left)
  const perSideTarget = Math.max(0, (target - barWeight) / 2)
  const perSide: number[] = []
  let remaining = perSideTarget
  for (const plate of plates) {
    while (remaining + EPS >= plate) {
      perSide.push(plate)
      remaining -= plate
    }
  }
  const loadedPerSide = perSide.reduce((sum, plate) => sum + plate, 0)
  return {
    target,
    barWeight,
    perSide,
    nearestLoadable: round2(barWeight + loadedPerSide * 2),
    leftoverPerSide: round2(Math.max(0, remaining)),
  }
}

/** How a single plate should be drawn: colour, label contrast, rim, and relative disc size. */
export type PlateVisual = {
  /** Disc fill colour. */
  fill: string
  /** Label colour with adequate contrast against `fill`. */
  textColor: string
  /** Rim stroke — darker on light discs so white/yellow stay visible on any theme. */
  border: string
  /** 0–1 diameter multiplier, monotonic in weight, so heavier plates read as larger discs. */
  relativeDiameter: number
}

const PLATE_TEXT_LIGHT = '#FFFFFF'
const PLATE_TEXT_DARK = '#1A1A1A'

/**
 * IWF competition plate colours, keyed by kg denomination (25 red, 20 blue, 15 yellow, 10 green,
 * 5 white; the change plates repeat the sequence). 1.25 kg is NOT an IWF colour — it falls through
 * to the chrome/grey default alongside any weight we don't recognise.
 */
const IWF_PLATE_COLORS: Record<number, { fill: string; textColor: string }> = {
  25: { fill: '#D42A2A', textColor: PLATE_TEXT_LIGHT },
  20: { fill: '#2C6FBB', textColor: PLATE_TEXT_LIGHT },
  15: { fill: '#E8B923', textColor: PLATE_TEXT_DARK },
  10: { fill: '#1F9B57', textColor: PLATE_TEXT_LIGHT },
  5: { fill: '#F4F4F5', textColor: PLATE_TEXT_DARK },
  2.5: { fill: '#D42A2A', textColor: PLATE_TEXT_LIGHT },
  2: { fill: '#2C6FBB', textColor: PLATE_TEXT_LIGHT },
  1.5: { fill: '#E8B923', textColor: PLATE_TEXT_DARK },
  1: { fill: '#1F9B57', textColor: PLATE_TEXT_LIGHT },
  0.5: { fill: '#F4F4F5', textColor: PLATE_TEXT_DARK },
}

/** Chrome/grey — 1.25 kg, any unknown weight, and every lb plate (no Olympic lb colour standard). */
const NEUTRAL_PLATE = { fill: '#B8BCC4', textColor: PLATE_TEXT_DARK }

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/**
 * Map a plate weight to how it should be drawn. kg uses the IWF colour standard; lb has no Olympic
 * colour convention so it renders as neutral steel discs sized by weight. Pure — safe to unit-test.
 */
export function plateVisual(weight: number, units: Unit): PlateVisual {
  const colors = units === 'kg' ? (IWF_PLATE_COLORS[weight] ?? NEUTRAL_PLATE) : NEUTRAL_PLATE

  // Diameter scales with the sqrt of weight (area-like) across the unit's own plate range, so the
  // smallest change plate stays visible and the heaviest never overflows. Monotonic in weight.
  const inventory = PLATE_INVENTORY[units]
  const hi = Math.max(...inventory)
  const lo = Math.min(...inventory)
  const spread = Math.sqrt(hi) - Math.sqrt(lo)
  const t = spread <= 0 ? 1 : (Math.sqrt(Math.max(weight, 0)) - Math.sqrt(lo)) / spread
  const relativeDiameter = clamp(0.4 + 0.6 * t, 0.34, 1)

  // Light discs (dark label) need a stronger rim to separate from a light modal surface.
  const border = colors.textColor === PLATE_TEXT_LIGHT ? 'rgba(0, 0, 0, 0.28)' : 'rgba(0, 0, 0, 0.42)'

  return { fill: colors.fill, textColor: colors.textColor, border, relativeDiameter }
}
