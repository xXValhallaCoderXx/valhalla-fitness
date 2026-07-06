import type { Unit } from '~/shared/types'

export const LB_PER_KG = 2.20462262185

export function convertWeight(value: number, sourceUnits: Unit, targetUnits: Unit) {
  if (sourceUnits === targetUnits) return value
  return sourceUnits === 'lb' ? value / LB_PER_KG : value * LB_PER_KG
}

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
