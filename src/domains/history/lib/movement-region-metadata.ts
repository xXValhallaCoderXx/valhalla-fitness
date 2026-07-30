import type { BodyRegionId } from '~/domains/history'
import type { Movement, MuscleGroup } from '~/domains/movement'

type RegionWeights = Partial<Record<BodyRegionId, number>>

const bodyRegionByMuscle: Record<MuscleGroup, BodyRegionId> = {
  chest: 'chest',
  shoulders: 'shoulders',
  triceps: 'triceps',
  upper_back: 'upper_back',
  biceps: 'biceps',
  forearms: 'biceps',
  core: 'core',
  quads: 'quads',
  hamstrings: 'hamstrings',
  glutes: 'glutes',
  calves: 'calves',
  hip_abductors: 'glutes',
  hip_adductors: 'glutes',
}

export function regionWeightsFromMovementMetadata(
  movement: Pick<Movement, 'primaryMuscles' | 'secondaryMuscles'> | undefined,
): RegionWeights {
  if (!movement?.primaryMuscles.length) return {}

  const weights: RegionWeights = {}
  const primaryShare = movement.secondaryMuscles.length ? 0.75 : 1
  addMuscleWeights(weights, movement.primaryMuscles, primaryShare)
  addMuscleWeights(weights, movement.secondaryMuscles, 1 - primaryShare)
  return weights
}

function addMuscleWeights(
  weights: RegionWeights,
  muscles: MuscleGroup[],
  totalShare: number,
) {
  if (!muscles.length || totalShare <= 0) return
  const share = totalShare / muscles.length
  for (const muscle of muscles) {
    const regionId = bodyRegionByMuscle[muscle]
    weights[regionId] = (weights[regionId] ?? 0) + share
  }
}
