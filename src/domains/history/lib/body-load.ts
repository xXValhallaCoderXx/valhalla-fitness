import type { BodyLoadRegion, BodyLoadSummary, BodyRegionId, BodyLoadTier, Movement, MovementRole } from '~/shared/types'
import { movementCatalog } from '~/domains/movement/lib/movements'

export type BodyLoadWork = {
  movementId: string
  movementName: string
  category?: string | null
  role: MovementRole
  completedSets: number
  performedAt?: string | null
}

type RegionWeights = Partial<Record<BodyRegionId, number>>

export const bodyRegionLabels: Record<BodyRegionId, string> = {
  chest: 'Chest',
  shoulders: 'Shoulders',
  triceps: 'Triceps',
  upper_back: 'Upper back',
  biceps: 'Biceps',
  core: 'Core',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
}

/** Plain-language fatigue level for each load tier, shown in the Muscle Fatigue view. */
export const bodyLoadTierLabels: Record<BodyLoadTier, string> = {
  fresh: 'Fresh',
  low: 'Light',
  moderate: 'Worked hard',
  high: 'Very fatigued',
}

/** One-line explanation of what the Muscle Fatigue metric measures. */
export const bodyLoadExplanation = 'How hard each muscle group has worked recently, based on your logged sets.'

export const bodyRegionOrder: BodyRegionId[] = [
  'chest',
  'shoulders',
  'triceps',
  'upper_back',
  'biceps',
  'core',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
]

const roleWeights: Record<MovementRole, number> = {
  main: 3,
  variation: 2,
  accessory: 1,
  warmup: 0.5,
  event: 0.5,
}

const recencyWeights = [1, 0.8, 0.65, 0.5, 0.35, 0.25, 0.15, 0.1]

const compoundMovementWeights: Record<string, RegionWeights> = {
  squat: { quads: 0.45, glutes: 0.3, hamstrings: 0.15, core: 0.1 },
  front_squat: { quads: 0.5, glutes: 0.25, core: 0.15, hamstrings: 0.1 },
  pause_squat: { quads: 0.45, glutes: 0.3, hamstrings: 0.15, core: 0.1 },
  safety_bar_squat: { quads: 0.45, glutes: 0.3, upper_back: 0.15, core: 0.1 },
  wide_stance_squat: { glutes: 0.35, quads: 0.3, hamstrings: 0.25, core: 0.1 },
  high_box_squat: { glutes: 0.4, hamstrings: 0.25, quads: 0.25, core: 0.1 },
  leg_press: { quads: 0.55, glutes: 0.3, hamstrings: 0.15 },
  hack_squat: { quads: 0.6, glutes: 0.25, hamstrings: 0.15 },
  split_squat: { quads: 0.45, glutes: 0.35, hamstrings: 0.2 },
  lunge: { quads: 0.4, glutes: 0.4, hamstrings: 0.2 },

  deadlift: { hamstrings: 0.35, glutes: 0.3, upper_back: 0.2, core: 0.15 },
  romanian_deadlift: { hamstrings: 0.45, glutes: 0.35, core: 0.1, upper_back: 0.1 },
  stiff_leg_deadlift: { hamstrings: 0.5, glutes: 0.3, core: 0.1, upper_back: 0.1 },
  good_morning: { hamstrings: 0.45, glutes: 0.3, core: 0.15, upper_back: 0.1 },
  block_deadlift: { hamstrings: 0.3, glutes: 0.3, upper_back: 0.25, core: 0.15 },
  sumo_deadlift: { glutes: 0.35, hamstrings: 0.25, quads: 0.2, upper_back: 0.1, core: 0.1 },
  low_trap_bar_deadlift: { glutes: 0.35, quads: 0.25, hamstrings: 0.2, upper_back: 0.1, core: 0.1 },

  bench_press: { chest: 0.5, triceps: 0.25, shoulders: 0.25 },
  close_grip_bench_press: { triceps: 0.4, chest: 0.35, shoulders: 0.25 },
  board_press: { triceps: 0.45, chest: 0.35, shoulders: 0.2 },
  wide_grip_bench_press: { chest: 0.55, shoulders: 0.25, triceps: 0.2 },
  pause_bench_press: { chest: 0.5, triceps: 0.25, shoulders: 0.25 },
  floor_press: { triceps: 0.4, chest: 0.35, shoulders: 0.25 },
  incline_bench_press: { chest: 0.4, shoulders: 0.35, triceps: 0.25 },
  dumbbell_bench_press: { chest: 0.5, triceps: 0.25, shoulders: 0.25 },
  incline_dumbbell_press: { chest: 0.4, shoulders: 0.35, triceps: 0.25 },
  push_up: { chest: 0.45, triceps: 0.3, shoulders: 0.15, core: 0.1 },

  overhead_press: { shoulders: 0.55, triceps: 0.25, core: 0.1, chest: 0.1 },
  behind_neck_press: { shoulders: 0.65, triceps: 0.2, upper_back: 0.15 },
  seated_pin_press: { shoulders: 0.55, triceps: 0.3, chest: 0.15 },
  seated_dumbbell_press: { shoulders: 0.55, triceps: 0.25, chest: 0.2 },
  wide_grip_overhead_press: { shoulders: 0.65, triceps: 0.2, core: 0.15 },
  push_press: { shoulders: 0.45, triceps: 0.2, quads: 0.15, glutes: 0.1, core: 0.1 },
  standing_pin_press: { shoulders: 0.55, triceps: 0.25, core: 0.2 },

  barbell_row: { upper_back: 0.7, biceps: 0.2, hamstrings: 0.05, core: 0.05 },
  t_bar_row: { upper_back: 0.75, biceps: 0.2, core: 0.05 },
  pendlay_row: { upper_back: 0.7, biceps: 0.2, hamstrings: 0.05, core: 0.05 },
  kroc_row: { upper_back: 0.7, biceps: 0.25, core: 0.05 },
  dumbbell_row: { upper_back: 0.7, biceps: 0.2, core: 0.1 },
  chin_up: { upper_back: 0.65, biceps: 0.3, core: 0.05 },
  pull_up: { upper_back: 0.7, biceps: 0.25, core: 0.05 },
  lat_pulldown: { upper_back: 0.7, biceps: 0.25, shoulders: 0.05 },
  v_handle_pulldown: { upper_back: 0.7, biceps: 0.25, shoulders: 0.05 },
  seated_cable_row: { upper_back: 0.75, biceps: 0.2, core: 0.05 },
  chest_supported_row: { upper_back: 0.8, biceps: 0.2 },
  machine_row: { upper_back: 0.8, biceps: 0.2 },
  machine_high_row: { upper_back: 0.75, biceps: 0.2, shoulders: 0.05 },
  one_arm_cable_row: { upper_back: 0.75, biceps: 0.2, core: 0.05 },
  upright_row: { shoulders: 0.45, upper_back: 0.35, biceps: 0.2 },
  face_pull: { upper_back: 0.6, shoulders: 0.4 },
  rear_delt_fly: { shoulders: 0.65, upper_back: 0.35 },

  triceps_pressdown: { triceps: 1 },
  rope_pressdown: { triceps: 1 },
  overhead_triceps_extension: { triceps: 1 },
  skullcrusher: { triceps: 0.9, shoulders: 0.1 },
  jm_press: { triceps: 0.75, chest: 0.15, shoulders: 0.1 },
  french_press: { triceps: 0.9, shoulders: 0.1 },
  barbell_curl: { biceps: 1 },

  hamstring_curl: { hamstrings: 1 },
  seated_leg_curl: { hamstrings: 1 },
  lying_leg_curl: { hamstrings: 1 },
  back_extension: { glutes: 0.45, hamstrings: 0.35, core: 0.2 },
  reverse_hyperextension: { glutes: 0.5, hamstrings: 0.35, core: 0.15 },
  glute_ham_raise: { hamstrings: 0.55, glutes: 0.35, core: 0.1 },

  cable_crunch: { core: 1 },
  hanging_leg_raise: { core: 1 },
  ab_wheel_rollout: { core: 1 },
  sit_up: { core: 1 },
  side_bend: { core: 1 },
}

const categoryFallbackWeights: Record<string, RegionWeights> = {
  upper: { chest: 0.35, shoulders: 0.3, triceps: 0.25, biceps: 0.1 },
  upper_back: { upper_back: 0.7, biceps: 0.2, shoulders: 0.1 },
  lower: { quads: 0.4, glutes: 0.35, hamstrings: 0.2, calves: 0.05 },
  hinge: { hamstrings: 0.4, glutes: 0.35, upper_back: 0.15, core: 0.1 },
  posterior_chain: { hamstrings: 0.45, glutes: 0.35, core: 0.2 },
  core: { core: 1 },
}

export function calculateBodyLoad(
  work: BodyLoadWork[],
  options: {
    now?: Date
    windowDays?: number
    catalog?: Record<string, Movement>
  } = {},
): BodyLoadSummary {
  const now = options.now ?? new Date()
  const windowDays = options.windowDays ?? 7
  const catalog = options.catalog ?? movementCatalog
  const regionState = new Map<BodyRegionId, {
    score: number
    recentSetCount: number
    lastTrainedAt?: string | null
    movementNames: Set<string>
  }>()

  for (const regionId of bodyRegionOrder) {
    regionState.set(regionId, {
      score: 0,
      recentSetCount: 0,
      lastTrainedAt: null,
      movementNames: new Set(),
    })
  }

  for (const item of work) {
    if (!item.completedSets) continue
    const performedAt = parseDate(item.performedAt)
    if (!performedAt) continue
    const daysAgo = daysBetween(performedAt, now)
    if (daysAgo < 0 || daysAgo > windowDays) continue

    const recencyWeight = recencyWeights[Math.min(daysAgo, recencyWeights.length - 1)] ?? 0.1
    const roleWeight = roleWeights[item.role] ?? 1
    const movement = catalog[item.movementId]
    const weights = resolveRegionWeights(item.movementId, item.category ?? movement?.category)
    const baseScore = item.completedSets * roleWeight * recencyWeight

    for (const [regionId, regionWeight] of Object.entries(weights) as Array<[BodyRegionId, number]>) {
      const state = regionState.get(regionId)
      if (!state || !regionWeight) continue
      state.score += baseScore * regionWeight
      state.recentSetCount += item.completedSets
      state.movementNames.add(item.movementName)
      if (!state.lastTrainedAt || performedAt.toISOString() > state.lastTrainedAt) {
        state.lastTrainedAt = performedAt.toISOString()
      }
    }
  }

  const regions = bodyRegionOrder.map((regionId): BodyLoadRegion => {
    const state = regionState.get(regionId)
    const score = roundOne(state?.score ?? 0)
    const impactPercent = Math.min(100, Math.max(0, Math.round((score / 12) * 100)))
    return {
      regionId,
      label: bodyRegionLabels[regionId],
      score,
      impactPercent,
      tier: tierForImpact(impactPercent),
      recentSetCount: state?.recentSetCount ?? 0,
      lastTrainedAt: state?.lastTrainedAt ?? null,
      movementNames: Array.from(state?.movementNames ?? []).slice(0, 4),
    }
  })

  const topRegions = [...regions]
    .filter((region) => region.impactPercent > 0)
    .sort((left, right) => {
      if (right.impactPercent !== left.impactPercent) return right.impactPercent - left.impactPercent
      return right.score - left.score
    })
    .slice(0, 5)

  return {
    generatedAt: now.toISOString(),
    windowDays,
    freshRegionCount: regions.filter((region) => region.tier === 'fresh').length,
    regions,
    topRegions,
  }
}

export function resolveRegionWeights(movementId: string, category?: string | null): RegionWeights {
  return compoundMovementWeights[movementId] ?? categoryFallbackWeights[category ?? ''] ?? {}
}

function tierForImpact(impactPercent: number): BodyLoadTier {
  if (impactPercent <= 0) return 'fresh'
  if (impactPercent <= 33) return 'low'
  if (impactPercent <= 66) return 'moderate'
  return 'high'
}

function parseDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function daysBetween(left: Date, right: Date) {
  const dayMs = 24 * 60 * 60 * 1000
  const leftDay = Date.UTC(left.getUTCFullYear(), left.getUTCMonth(), left.getUTCDate())
  const rightDay = Date.UTC(right.getUTCFullYear(), right.getUTCMonth(), right.getUTCDate())
  return Math.floor((rightDay - leftDay) / dayMs)
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10
}
