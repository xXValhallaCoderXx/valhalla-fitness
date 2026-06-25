export function mround(value: number, increment: number) {
  if (!Number.isFinite(value) || !Number.isFinite(increment) || increment <= 0) {
    return value
  }
  return Math.round(value / increment) * increment
}

export function e1rm(weight: number, reps: number, rir = 0) {
  if (weight <= 0 || reps <= 0) return 0
  return weight * (1 + (reps + Math.max(rir, 0)) / 30)
}
