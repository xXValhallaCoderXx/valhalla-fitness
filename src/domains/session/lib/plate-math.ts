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
