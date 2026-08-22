import type { Unit } from '~/shared/types'

export type MovementStatus = 'active' | 'deprecated'

export type ResistanceMode =
  | 'barbell'
  | 'dumbbell'
  | 'specialty_bar'
  | 'bodyweight'
  | 'cable'
  | 'machine'

export type LoadConvention =
  | 'total_external'
  | 'implement_weight'
  | 'added_to_bodyweight'
  | 'bodyweight_only'
  | 'device_display'
  | 'assistance'

export type MovementPattern =
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'horizontal_push'
  | 'vertical_push'
  | 'horizontal_pull'
  | 'vertical_pull'
  | 'elbow_flexion'
  | 'elbow_extension'
  | 'knee_flexion'
  | 'knee_extension'
  | 'hip_extension'
  | 'hip_abduction'
  | 'hip_adduction'
  | 'shoulder_abduction'
  | 'scapular_elevation'
  | 'calf_raise'
  | 'trunk_flexion'
  | 'trunk_lateral_flexion'
  | 'trunk_rotation'

export type MuscleGroup =
  | 'chest'
  | 'shoulders'
  | 'triceps'
  | 'upper_back'
  | 'biceps'
  | 'forearms'
  | 'core'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'hip_abductors'
  | 'hip_adductors'

export type RequiredEquipment =
  | 'barbell'
  | 'dumbbells'
  | 'specialty_bar'
  | 'rack'
  | 'bench'
  | 'plates'
  | 'pull_up_bar'
  | 'dip_bars'
  | 'cable'
  | 'machine'
  | 'smith_machine'
  | 'landmine'
  | 'box'
  | 'ab_wheel'
  | 'sliders'
  | 'bodyweight'

export type Movement = {
  id: string
  name: string
  category: string
  equipment: string[]
  variationOf?: string | null
  defaultUnit: Unit
  isCompetition: boolean
  status: MovementStatus
  resistanceMode: ResistanceMode | null
  requiredEquipment: RequiredEquipment[]
  pattern: MovementPattern
  primaryMuscles: MuscleGroup[]
  secondaryMuscles: MuscleGroup[]
  aliases: string[]
  loadConvention: LoadConvention
  replacedByMovementId: string | null
  canonicalFreeWeightMovementId: string | null
}
