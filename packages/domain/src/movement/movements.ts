import type {
  LoadConvention,
  Movement,
  MovementPattern,
  MovementReplacementRule,
  MovementSwapOption,
  MuscleGroup,
  RequiredEquipment,
  ResistanceMode,
} from '@sheetless/domain/movement/types'
import type { MovementRole } from '@sheetless/domain/shared/types'

type LegacyMovement = Omit<
  Movement,
  | 'status'
  | 'resistanceMode'
  | 'requiredEquipment'
  | 'pattern'
  | 'primaryMuscles'
  | 'secondaryMuscles'
  | 'aliases'
  | 'loadConvention'
  | 'replacedByMovementId'
  | 'canonicalFreeWeightMovementId'
>

const legacyMovementCatalog: Record<string, LegacyMovement> = {
  squat: {
    id: 'squat',
    name: 'Squat',
    category: 'lower',
    equipment: ['barbell', 'rack', 'plates'],
    defaultUnit: 'kg',
    isCompetition: true,
  },
  bench_press: {
    id: 'bench_press',
    name: 'Bench Press',
    category: 'upper',
    equipment: ['barbell', 'bench', 'plates'],
    defaultUnit: 'kg',
    isCompetition: true,
  },
  deadlift: {
    id: 'deadlift',
    name: 'Deadlift',
    category: 'lower',
    equipment: ['barbell', 'plates'],
    defaultUnit: 'kg',
    isCompetition: true,
  },
  overhead_press: {
    id: 'overhead_press',
    name: 'Overhead Press',
    category: 'upper',
    equipment: ['barbell', 'rack', 'plates'],
    defaultUnit: 'kg',
    isCompetition: true,
  },
  front_squat: {
    id: 'front_squat',
    name: 'Front Squat',
    category: 'lower',
    equipment: ['barbell', 'rack', 'plates'],
    variationOf: 'squat',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  close_grip_bench_press: {
    id: 'close_grip_bench_press',
    name: 'Close-Grip Bench Press',
    category: 'upper',
    equipment: ['barbell', 'bench', 'plates'],
    variationOf: 'bench_press',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  stiff_leg_deadlift: {
    id: 'stiff_leg_deadlift',
    name: 'Stiff-Leg Deadlift',
    category: 'hinge',
    equipment: ['barbell', 'plates'],
    variationOf: 'deadlift',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  behind_neck_press: {
    id: 'behind_neck_press',
    name: 'Behind-the-Neck Press',
    category: 'upper',
    equipment: ['barbell', 'rack', 'plates'],
    variationOf: 'overhead_press',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  pause_squat: {
    id: 'pause_squat',
    name: 'Pause Squat',
    category: 'lower',
    equipment: ['barbell', 'rack', 'plates'],
    variationOf: 'squat',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  board_press: {
    id: 'board_press',
    name: 'Board Press',
    category: 'upper',
    equipment: ['barbell', 'bench', 'plates'],
    variationOf: 'bench_press',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  low_trap_bar_deadlift: {
    id: 'low_trap_bar_deadlift',
    name: 'Low Trap Bar Deadlift',
    category: 'hinge',
    equipment: ['specialty_bars', 'plates'],
    variationOf: 'deadlift',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  seated_pin_press: {
    id: 'seated_pin_press',
    name: 'Seated Pin Press',
    category: 'upper',
    equipment: ['barbell', 'rack', 'bench', 'plates'],
    variationOf: 'overhead_press',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  romanian_deadlift: {
    id: 'romanian_deadlift',
    name: 'Romanian Deadlift',
    category: 'hinge',
    equipment: ['barbell', 'plates'],
    variationOf: 'deadlift',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  seated_cable_row: {
    id: 'seated_cable_row',
    name: 'Seated Cable Row',
    category: 'upper_back',
    equipment: ['cable', 'machine'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  machine_row: {
    id: 'machine_row',
    name: 'Machine Row',
    category: 'upper_back',
    equipment: ['machine'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  one_arm_cable_row: {
    id: 'one_arm_cable_row',
    name: 'One-Arm Cable Row',
    category: 'upper_back',
    equipment: ['cable'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  chest_supported_row: {
    id: 'chest_supported_row',
    name: 'Chest-Supported Row',
    category: 'upper_back',
    equipment: ['machine', 'dumbbells'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  lat_pulldown: {
    id: 'lat_pulldown',
    name: 'Lat Pulldown',
    category: 'upper_back',
    equipment: ['cable', 'machine'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  pull_up: {
    id: 'pull_up',
    name: 'Pull-Up',
    category: 'upper_back',
    equipment: ['bodyweight'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  machine_high_row: {
    id: 'machine_high_row',
    name: 'Machine High Row',
    category: 'upper_back',
    equipment: ['machine'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  leg_press: {
    id: 'leg_press',
    name: 'Leg Press',
    category: 'lower',
    equipment: ['machine'],
    variationOf: 'squat',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  hack_squat: {
    id: 'hack_squat',
    name: 'Hack Squat',
    category: 'lower',
    equipment: ['machine'],
    variationOf: 'squat',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  split_squat: {
    id: 'split_squat',
    name: 'Split Squat',
    category: 'lower',
    equipment: ['dumbbells', 'bodyweight'],
    variationOf: 'squat',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  hamstring_curl: {
    id: 'hamstring_curl',
    name: 'Hamstring Curl',
    category: 'posterior_chain',
    equipment: ['machine'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  seated_leg_curl: {
    id: 'seated_leg_curl',
    name: 'Seated Leg Curl',
    category: 'posterior_chain',
    equipment: ['machine'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  lying_leg_curl: {
    id: 'lying_leg_curl',
    name: 'Lying Leg Curl',
    category: 'posterior_chain',
    equipment: ['machine'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  back_extension: {
    id: 'back_extension',
    name: 'Back Extension',
    category: 'posterior_chain',
    equipment: ['machine', 'bodyweight'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  reverse_hyperextension: {
    id: 'reverse_hyperextension',
    name: 'Reverse Hyperextension',
    category: 'posterior_chain',
    equipment: ['machine'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  glute_ham_raise: {
    id: 'glute_ham_raise',
    name: 'Glute-Ham Raise',
    category: 'posterior_chain',
    equipment: ['machine', 'bodyweight'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  cable_crunch: {
    id: 'cable_crunch',
    name: 'Cable Crunch',
    category: 'core',
    equipment: ['cable'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  hanging_leg_raise: {
    id: 'hanging_leg_raise',
    name: 'Hanging Leg Raise',
    category: 'core',
    equipment: ['bodyweight'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  ab_wheel_rollout: {
    id: 'ab_wheel_rollout',
    name: 'Ab Wheel Rollout',
    category: 'core',
    equipment: ['bodyweight'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  dumbbell_row: {
    id: 'dumbbell_row',
    name: 'Dumbbell Row',
    category: 'upper_back',
    equipment: ['dumbbells', 'bench'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  dumbbell_bench_press: {
    id: 'dumbbell_bench_press',
    name: 'Dumbbell Bench Press',
    category: 'upper',
    equipment: ['dumbbells', 'bench'],
    variationOf: 'bench_press',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  incline_dumbbell_press: {
    id: 'incline_dumbbell_press',
    name: 'Incline Dumbbell Press',
    category: 'upper',
    equipment: ['dumbbells', 'bench'],
    variationOf: 'bench_press',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  push_up: {
    id: 'push_up',
    name: 'Push-Up',
    category: 'upper',
    equipment: ['bodyweight'],
    variationOf: 'bench_press',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  triceps_pressdown: {
    id: 'triceps_pressdown',
    name: 'Triceps Pressdown',
    category: 'upper',
    equipment: ['cable'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  overhead_triceps_extension: {
    id: 'overhead_triceps_extension',
    name: 'Overhead Triceps Extension',
    category: 'upper',
    equipment: ['cable', 'dumbbells'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  skullcrusher: {
    id: 'skullcrusher',
    name: 'Skullcrusher',
    category: 'upper',
    equipment: ['barbell', 'dumbbells', 'bench'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  face_pull: {
    id: 'face_pull',
    name: 'Face Pull',
    category: 'upper_back',
    equipment: ['cable'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  rear_delt_fly: {
    id: 'rear_delt_fly',
    name: 'Rear Delt Fly',
    category: 'upper_back',
    equipment: ['dumbbells', 'machine'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  safety_bar_squat: {
    id: 'safety_bar_squat',
    name: 'Safety Bar Squat',
    category: 'lower',
    equipment: ['specialty_bars', 'rack', 'plates'],
    variationOf: 'squat',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  good_morning: {
    id: 'good_morning',
    name: 'Good Morning',
    category: 'hinge',
    equipment: ['barbell', 'rack', 'plates'],
    variationOf: 'deadlift',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  seated_dumbbell_press: {
    id: 'seated_dumbbell_press',
    name: 'Seated Dumbbell Press',
    category: 'upper',
    equipment: ['dumbbells', 'bench'],
    variationOf: 'overhead_press',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  wide_grip_bench_press: {
    id: 'wide_grip_bench_press',
    name: 'Wide-Grip Bench Press',
    category: 'upper',
    equipment: ['barbell', 'bench', 'plates'],
    variationOf: 'bench_press',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  pause_bench_press: {
    id: 'pause_bench_press',
    name: 'Pause Bench Press',
    category: 'upper',
    equipment: ['barbell', 'bench', 'plates'],
    variationOf: 'bench_press',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  floor_press: {
    id: 'floor_press',
    name: 'Floor Press',
    category: 'upper',
    equipment: ['barbell', 'plates'],
    variationOf: 'bench_press',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  incline_bench_press: {
    id: 'incline_bench_press',
    name: 'Incline Bench Press',
    category: 'upper',
    equipment: ['barbell', 'bench', 'plates'],
    variationOf: 'bench_press',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  wide_stance_squat: {
    id: 'wide_stance_squat',
    name: 'Wide-Stance Squat',
    category: 'lower',
    equipment: ['barbell', 'rack', 'plates'],
    variationOf: 'squat',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  high_box_squat: {
    id: 'high_box_squat',
    name: 'High Box Squat',
    category: 'lower',
    equipment: ['barbell', 'rack', 'box', 'plates'],
    variationOf: 'squat',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  lunge: {
    id: 'lunge',
    name: 'Lunge',
    category: 'lower',
    equipment: ['dumbbells', 'bodyweight'],
    variationOf: 'squat',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  wide_grip_overhead_press: {
    id: 'wide_grip_overhead_press',
    name: 'Wide-Grip Overhead Press',
    category: 'upper',
    equipment: ['barbell', 'rack', 'plates'],
    variationOf: 'overhead_press',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  push_press: {
    id: 'push_press',
    name: 'Push Press',
    category: 'upper',
    equipment: ['barbell', 'rack', 'plates'],
    variationOf: 'overhead_press',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  standing_pin_press: {
    id: 'standing_pin_press',
    name: 'Standing Pin Press',
    category: 'upper',
    equipment: ['barbell', 'rack', 'plates'],
    variationOf: 'overhead_press',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  block_deadlift: {
    id: 'block_deadlift',
    name: 'Block Deadlift',
    category: 'hinge',
    equipment: ['barbell', 'plates', 'blocks'],
    variationOf: 'deadlift',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  sumo_deadlift: {
    id: 'sumo_deadlift',
    name: 'Sumo Deadlift',
    category: 'hinge',
    equipment: ['barbell', 'plates'],
    variationOf: 'deadlift',
    defaultUnit: 'kg',
    isCompetition: false,
  },
  barbell_row: {
    id: 'barbell_row',
    name: 'Barbell Row',
    category: 'upper_back',
    equipment: ['barbell', 'plates'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  t_bar_row: {
    id: 't_bar_row',
    name: 'T-Bar Row',
    category: 'upper_back',
    equipment: ['barbell', 'plates', 'machine'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  pendlay_row: {
    id: 'pendlay_row',
    name: 'Pendlay Row',
    category: 'upper_back',
    equipment: ['barbell', 'plates'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  kroc_row: {
    id: 'kroc_row',
    name: 'Kroc Row',
    category: 'upper_back',
    equipment: ['dumbbells'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  chin_up: {
    id: 'chin_up',
    name: 'Chin-Up',
    category: 'upper_back',
    equipment: ['bodyweight'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  v_handle_pulldown: {
    id: 'v_handle_pulldown',
    name: 'V-Handle Pulldown',
    category: 'upper_back',
    equipment: ['cable', 'machine'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  upright_row: {
    id: 'upright_row',
    name: 'Upright Row',
    category: 'upper_back',
    equipment: ['barbell', 'dumbbells', 'cable'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  barbell_curl: {
    id: 'barbell_curl',
    name: 'Barbell Curl',
    category: 'upper',
    equipment: ['barbell', 'plates'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  dumbbell_curl: {
    id: 'dumbbell_curl',
    name: 'Dumbbell Curl',
    category: 'upper',
    equipment: ['dumbbells'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  rope_pressdown: {
    id: 'rope_pressdown',
    name: 'Rope Pressdown',
    category: 'upper',
    equipment: ['cable'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  jm_press: {
    id: 'jm_press',
    name: 'JM Press',
    category: 'upper',
    equipment: ['barbell', 'bench', 'plates'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  french_press: {
    id: 'french_press',
    name: 'French Press',
    category: 'upper',
    equipment: ['barbell', 'dumbbells'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  sit_up: {
    id: 'sit_up',
    name: 'Sit-Up',
    category: 'core',
    equipment: ['bodyweight'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
  side_bend: {
    id: 'side_bend',
    name: 'Side Bend',
    category: 'core',
    equipment: ['dumbbells', 'cable'],
    defaultUnit: 'kg',
    isCompetition: false,
  },
}

type AddedMovementDefinition = readonly [
  id: string,
  name: string,
  category: string,
  equipment: string[],
  variationOf?: string,
]

const addedMovementDefinitions: AddedMovementDefinition[] = [
  ['chest_supported_dumbbell_row', 'Chest-Supported Dumbbell Row', 'upper_back', ['dumbbells', 'bench']],
  ['machine_chest_supported_row', 'Machine Chest-Supported Row', 'upper_back', ['machine']],
  ['landmine_t_bar_row', 'Landmine T-Bar Row', 'upper_back', ['barbell', 'plates', 'landmine']],
  ['machine_t_bar_row', 'Machine T-Bar Row', 'upper_back', ['machine']],
  ['dumbbell_split_squat', 'Dumbbell Split Squat', 'lower', ['dumbbells'], 'squat'],
  ['bodyweight_split_squat', 'Bodyweight Split Squat', 'lower', ['bodyweight'], 'squat'],
  ['dumbbell_lunge', 'Dumbbell Lunge', 'lower', ['dumbbells'], 'squat'],
  ['bodyweight_lunge', 'Bodyweight Lunge', 'lower', ['bodyweight'], 'squat'],
  ['back_extension_45_degree', '45-Degree Back Extension', 'posterior_chain', ['bodyweight', 'machine']],
  ['machine_back_extension', 'Machine Back Extension', 'posterior_chain', ['machine']],
  ['dumbbell_overhead_triceps_extension', 'Dumbbell Overhead Triceps Extension', 'upper', ['dumbbells']],
  ['cable_overhead_triceps_extension', 'Cable Overhead Triceps Extension', 'upper', ['cable']],
  ['barbell_skullcrusher', 'Barbell Skullcrusher', 'upper', ['barbell', 'bench', 'plates']],
  ['dumbbell_skullcrusher', 'Dumbbell Skullcrusher', 'upper', ['dumbbells', 'bench']],
  ['barbell_french_press', 'Barbell French Press', 'upper', ['barbell', 'plates']],
  ['dumbbell_french_press', 'Dumbbell French Press', 'upper', ['dumbbells']],
  ['dumbbell_rear_delt_fly', 'Dumbbell Rear Delt Fly', 'upper_back', ['dumbbells']],
  ['reverse_pec_deck', 'Reverse Pec Deck', 'upper_back', ['machine']],
  ['barbell_upright_row', 'Barbell Upright Row', 'upper_back', ['barbell', 'plates']],
  ['dumbbell_upright_row', 'Dumbbell Upright Row', 'upper_back', ['dumbbells']],
  ['cable_upright_row', 'Cable Upright Row', 'upper_back', ['cable']],
  ['dumbbell_side_bend', 'Dumbbell Side Bend', 'core', ['dumbbells']],
  ['cable_side_bend', 'Cable Side Bend', 'core', ['cable']],
  ['goblet_squat', 'Goblet Squat', 'lower', ['dumbbells'], 'squat'],
  ['dumbbell_bulgarian_split_squat', 'Dumbbell Bulgarian Split Squat', 'lower', ['dumbbells', 'bench'], 'squat'],
  ['dumbbell_step_up', 'Dumbbell Step-Up', 'lower', ['dumbbells', 'box'], 'squat'],
  ['leg_extension', 'Leg Extension', 'lower', ['machine']],
  ['standing_dumbbell_calf_raise', 'Standing Dumbbell Calf Raise', 'lower', ['dumbbells']],
  ['seated_dumbbell_calf_raise', 'Seated Dumbbell Calf Raise', 'lower', ['dumbbells', 'bench']],
  ['standing_machine_calf_raise', 'Standing Machine Calf Raise', 'lower', ['machine']],
  ['seated_machine_calf_raise', 'Seated Machine Calf Raise', 'lower', ['machine']],
  ['dumbbell_romanian_deadlift', 'Dumbbell Romanian Deadlift', 'hinge', ['dumbbells'], 'deadlift'],
  ['single_leg_dumbbell_romanian_deadlift', 'Single-Leg Dumbbell Romanian Deadlift', 'hinge', ['dumbbells'], 'deadlift'],
  ['barbell_hip_thrust', 'Barbell Hip Thrust', 'posterior_chain', ['barbell', 'bench', 'plates']],
  ['sliding_leg_curl', 'Sliding Leg Curl', 'posterior_chain', ['bodyweight', 'sliders']],
  ['nordic_hamstring_curl', 'Nordic Hamstring Curl', 'posterior_chain', ['bodyweight']],
  ['hip_thrust_machine', 'Hip Thrust Machine', 'posterior_chain', ['machine']],
  ['dumbbell_fly', 'Dumbbell Fly', 'upper', ['dumbbells', 'bench'], 'bench_press'],
  ['dip', 'Dip', 'upper', ['bodyweight', 'dip_bars'], 'bench_press'],
  ['machine_chest_press', 'Machine Chest Press', 'upper', ['machine'], 'bench_press'],
  ['pec_deck', 'Pec Deck', 'upper', ['machine'], 'bench_press'],
  ['standing_dumbbell_press', 'Standing Dumbbell Press', 'upper', ['dumbbells'], 'overhead_press'],
  ['dumbbell_lateral_raise', 'Dumbbell Lateral Raise', 'upper', ['dumbbells']],
  ['cable_lateral_raise', 'Cable Lateral Raise', 'upper', ['cable']],
  ['seal_row', 'Seal Row', 'upper_back', ['barbell', 'bench', 'plates']],
  ['inverted_row', 'Inverted Row', 'upper_back', ['bodyweight', 'rack']],
  ['neutral_grip_pull_up', 'Neutral-Grip Pull-Up', 'upper_back', ['bodyweight', 'pull_up_bar']],
  ['dumbbell_pullover', 'Dumbbell Pullover', 'upper_back', ['dumbbells', 'bench']],
  ['barbell_shrug', 'Barbell Shrug', 'upper_back', ['barbell', 'plates']],
  ['straight_arm_cable_pulldown', 'Straight-Arm Cable Pulldown', 'upper_back', ['cable']],
  ['hammer_curl', 'Hammer Curl', 'upper', ['dumbbells']],
  ['incline_dumbbell_curl', 'Incline Dumbbell Curl', 'upper', ['dumbbells', 'bench']],
  ['ez_bar_preacher_curl', 'EZ-Bar Preacher Curl', 'upper', ['specialty_bars', 'bench', 'plates']],
  ['cable_curl', 'Cable Curl', 'upper', ['cable']],
  ['machine_preacher_curl', 'Machine Preacher Curl', 'upper', ['machine']],
  ['weighted_sit_up', 'Weighted Sit-Up', 'core', ['dumbbells']],
  ['reverse_crunch', 'Reverse Crunch', 'core', ['bodyweight']],
  ['side_lying_hip_abduction', 'Side-Lying Hip Abduction', 'lower', ['bodyweight']],
  ['hip_abduction_machine', 'Hip Abduction Machine', 'lower', ['machine']],
  ['smith_machine_squat', 'Smith Machine Squat', 'lower', ['smith_machine', 'plates'], 'squat'],
  ['single_leg_glute_bridge', 'Single-Leg Glute Bridge', 'posterior_chain', ['bodyweight']],
  ['cable_glute_kickback', 'Cable Glute Kickback', 'posterior_chain', ['cable']],
  ['side_lying_hip_adduction', 'Side-Lying Hip Adduction', 'lower', ['bodyweight']],
  ['hip_adduction_machine', 'Hip Adduction Machine', 'lower', ['machine']],
  ['dumbbell_floor_press', 'Dumbbell Floor Press', 'upper', ['dumbbells'], 'bench_press'],
  ['neutral_grip_dumbbell_bench_press', 'Neutral-Grip Dumbbell Bench Press', 'upper', ['dumbbells', 'bench'], 'bench_press'],
  ['cable_fly', 'Cable Fly', 'upper', ['cable'], 'bench_press'],
  ['incline_machine_chest_press', 'Incline Machine Chest Press', 'upper', ['machine'], 'bench_press'],
  ['machine_shoulder_press', 'Machine Shoulder Press', 'upper', ['machine'], 'overhead_press'],
  ['machine_lateral_raise', 'Machine Lateral Raise', 'upper', ['machine']],
  ['assisted_dip', 'Assisted Dip', 'upper', ['machine', 'dip_bars'], 'bench_press'],
  ['assisted_pull_up', 'Assisted Pull-Up', 'upper_back', ['machine', 'pull_up_bar']],
  ['single_arm_lat_pulldown', 'Single-Arm Lat Pulldown', 'upper_back', ['cable']],
  ['machine_pullover', 'Machine Pullover', 'upper_back', ['machine']],
  ['dumbbell_shrug', 'Dumbbell Shrug', 'upper_back', ['dumbbells']],
  ['concentration_curl', 'Concentration Curl', 'upper', ['dumbbells']],
  ['reverse_barbell_curl', 'Reverse Barbell Curl', 'upper', ['barbell', 'plates']],
  ['rope_hammer_curl', 'Rope Hammer Curl', 'upper', ['cable']],
  ['dumbbell_triceps_kickback', 'Dumbbell Triceps Kickback', 'upper', ['dumbbells']],
  ['hanging_knee_raise', 'Hanging Knee Raise', 'core', ['bodyweight', 'pull_up_bar']],
  ['dumbbell_russian_twist', 'Dumbbell Russian Twist', 'core', ['dumbbells']],
]

const addedMovementCatalog: Record<string, LegacyMovement> = Object.fromEntries(
  addedMovementDefinitions.map(([id, name, category, equipment, variationOf]) => [
    id,
    {
      id,
      name,
      category,
      equipment,
      variationOf: variationOf ?? null,
      defaultUnit: 'kg' as const,
      isCompetition: false,
    },
  ]),
)

const deprecatedMovementReplacements = {
  chest_supported_row: 'chest_supported_dumbbell_row',
  split_squat: 'dumbbell_split_squat',
  back_extension: 'back_extension_45_degree',
  overhead_triceps_extension: 'dumbbell_overhead_triceps_extension',
  skullcrusher: 'barbell_skullcrusher',
  rear_delt_fly: 'dumbbell_rear_delt_fly',
  t_bar_row: 'landmine_t_bar_row',
  lunge: 'dumbbell_lunge',
  upright_row: 'barbell_upright_row',
  french_press: 'barbell_french_press',
  side_bend: 'dumbbell_side_bend',
} as const satisfies Record<string, string>

const preciseAliasById: Record<string, string[]> = {
  chest_supported_dumbbell_row: ['chest-supported row'],
  landmine_t_bar_row: ['t-bar row'],
  dumbbell_split_squat: ['split squat'],
  dumbbell_lunge: ['lunge'],
  back_extension_45_degree: ['back extension', 'hyperextension'],
  dumbbell_overhead_triceps_extension: ['overhead triceps extension'],
  barbell_skullcrusher: ['skullcrusher'],
  barbell_french_press: ['french press'],
  dumbbell_rear_delt_fly: ['rear delt fly'],
  barbell_upright_row: ['upright row'],
  dumbbell_side_bend: ['side bend'],
  ez_bar_preacher_curl: ['ez bar preacher curl'],
}

const freeWeightCanonicalById: Record<string, string> = {
  seated_cable_row: 'barbell_row',
  one_arm_cable_row: 'dumbbell_row',
  machine_chest_supported_row: 'chest_supported_dumbbell_row',
  machine_t_bar_row: 'landmine_t_bar_row',
  lat_pulldown: 'pull_up',
  v_handle_pulldown: 'neutral_grip_pull_up',
  single_arm_lat_pulldown: 'pull_up',
  assisted_pull_up: 'pull_up',
  machine_high_row: 'chest_supported_dumbbell_row',
  machine_row: 'chest_supported_dumbbell_row',
  leg_press: 'goblet_squat',
  hack_squat: 'goblet_squat',
  smith_machine_squat: 'goblet_squat',
  leg_extension: 'goblet_squat',
  hamstring_curl: 'sliding_leg_curl',
  seated_leg_curl: 'sliding_leg_curl',
  lying_leg_curl: 'sliding_leg_curl',
  standing_machine_calf_raise: 'standing_dumbbell_calf_raise',
  seated_machine_calf_raise: 'seated_dumbbell_calf_raise',
  hip_thrust_machine: 'barbell_hip_thrust',
  reverse_hyperextension: 'back_extension_45_degree',
  glute_ham_raise: 'nordic_hamstring_curl',
  machine_chest_press: 'dumbbell_bench_press',
  incline_machine_chest_press: 'incline_dumbbell_press',
  pec_deck: 'dumbbell_fly',
  cable_fly: 'dumbbell_fly',
  machine_shoulder_press: 'standing_dumbbell_press',
  machine_lateral_raise: 'dumbbell_lateral_raise',
  cable_lateral_raise: 'dumbbell_lateral_raise',
  face_pull: 'dumbbell_rear_delt_fly',
  cable_overhead_triceps_extension: 'dumbbell_overhead_triceps_extension',
  triceps_pressdown: 'dumbbell_triceps_kickback',
  rope_pressdown: 'dumbbell_triceps_kickback',
  cable_curl: 'dumbbell_curl',
  machine_preacher_curl: 'ez_bar_preacher_curl',
  reverse_pec_deck: 'dumbbell_rear_delt_fly',
  cable_upright_row: 'barbell_upright_row',
  cable_side_bend: 'dumbbell_side_bend',
  cable_crunch: 'weighted_sit_up',
  straight_arm_cable_pulldown: 'dumbbell_pullover',
  machine_pullover: 'dumbbell_pullover',
  hip_abduction_machine: 'side_lying_hip_abduction',
  hip_adduction_machine: 'side_lying_hip_adduction',
  cable_glute_kickback: 'single_leg_glute_bridge',
  assisted_dip: 'dip',
  rope_hammer_curl: 'hammer_curl',
}

const patternMuscles: Record<MovementPattern, { primary: MuscleGroup[]; secondary: MuscleGroup[] }> = {
  squat: { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'core'] },
  hinge: { primary: ['hamstrings', 'glutes'], secondary: ['upper_back', 'core'] },
  lunge: { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'core'] },
  horizontal_push: { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  vertical_push: { primary: ['shoulders'], secondary: ['triceps', 'core'] },
  horizontal_pull: { primary: ['upper_back'], secondary: ['biceps', 'core'] },
  vertical_pull: { primary: ['upper_back'], secondary: ['biceps', 'core'] },
  elbow_flexion: { primary: ['biceps'], secondary: ['forearms'] },
  elbow_extension: { primary: ['triceps'], secondary: ['shoulders'] },
  knee_flexion: { primary: ['hamstrings'], secondary: ['glutes'] },
  knee_extension: { primary: ['quads'], secondary: [] },
  hip_extension: { primary: ['glutes'], secondary: ['hamstrings', 'core'] },
  hip_abduction: { primary: ['hip_abductors', 'glutes'], secondary: [] },
  hip_adduction: { primary: ['hip_adductors'], secondary: [] },
  shoulder_abduction: { primary: ['shoulders'], secondary: ['upper_back'] },
  scapular_elevation: { primary: ['upper_back'], secondary: ['forearms'] },
  calf_raise: { primary: ['calves'], secondary: [] },
  trunk_flexion: { primary: ['core'], secondary: [] },
  trunk_lateral_flexion: { primary: ['core'], secondary: [] },
  trunk_rotation: { primary: ['core'], secondary: [] },
}

function movementPattern(movement: LegacyMovement): MovementPattern {
  const id = movement.id
  if (id === 'deadlift') return 'hinge'
  if (id === 'overhead_press') return 'vertical_push'
  if (id === 'incline_dumbbell_press') return 'horizontal_push'
  if (id.includes('calf_raise')) return 'calf_raise'
  if (id.includes('hip_abduction')) return 'hip_abduction'
  if (id.includes('hip_adduction')) return 'hip_adduction'
  if (id.includes('lateral_raise') || id.includes('rear_delt_fly') || id === 'reverse_pec_deck' || id.includes('upright_row') || id === 'face_pull') return 'shoulder_abduction'
  if (id.includes('shrug')) return 'scapular_elevation'
  if (id.includes('leg_curl') || id.includes('hamstring_curl') || id.includes('glute_ham_raise')) return 'knee_flexion'
  if (id.includes('curl') && !id.includes('leg_curl')) return 'elbow_flexion'
  if (id.includes('triceps') || id.includes('pressdown') || id.includes('skullcrusher') || id.includes('french_press') || id === 'jm_press') return 'elbow_extension'
  if (id.includes('side_bend')) return 'trunk_lateral_flexion'
  if (id.includes('russian_twist')) return 'trunk_rotation'
  if (movement.category === 'core') return 'trunk_flexion'
  if (id.includes('leg_extension')) return 'knee_extension'
  if (id.includes('hip_thrust') || id.includes('glute_bridge') || id.includes('glute_kickback') || id.includes('back_extension') || id.includes('hyperextension')) return 'hip_extension'
  if (id.includes('lunge') || id.includes('split_squat') || id.includes('step_up')) return 'lunge'
  if (movement.category === 'lower') return 'squat'
  if (movement.category === 'hinge' || movement.category === 'posterior_chain') return 'hinge'
  if (id.includes('pulldown') || id.includes('pull_up') || id.includes('chin_up') || id.includes('pullover')) return 'vertical_pull'
  if (movement.category === 'upper_back') return 'horizontal_pull'
  if (movement.variationOf === 'overhead_press' || id.includes('shoulder_press') || id.includes('dumbbell_press') || id.includes('pin_press') || id === 'push_press' || id === 'behind_neck_press') return 'vertical_push'
  return 'horizontal_push'
}

function resistanceMode(movement: LegacyMovement): ResistanceMode {
  const id = movement.id
  if (id.startsWith('assisted_')) return 'machine'
  if (id === 'back_extension_45_degree' || id === 'glute_ham_raise') return 'bodyweight'
  if (id.includes('smith_machine')) return 'machine'
  if (movement.equipment.includes('cable')) return 'cable'
  if (movement.equipment.includes('machine')) return 'machine'
  if (movement.equipment.includes('specialty_bars')) return 'specialty_bar'
  if (movement.equipment.includes('barbell')) return 'barbell'
  if (movement.equipment.includes('dumbbells')) return 'dumbbell'
  return 'bodyweight'
}

function requiredEquipment(movement: LegacyMovement): RequiredEquipment[] {
  const normalized = movement.equipment.map((item): RequiredEquipment | null => {
    if (item === 'specialty_bars') return 'specialty_bar'
    if (item === 'blocks') return 'box'
    if (item === 'dumbbells') return 'dumbbells'
    if (item === 'barbell' || item === 'rack' || item === 'bench' || item === 'plates' || item === 'cable' || item === 'machine' || item === 'box' || item === 'landmine' || item === 'pull_up_bar' || item === 'dip_bars' || item === 'smith_machine' || item === 'sliders' || item === 'bodyweight') return item
    return null
  }).filter((item): item is RequiredEquipment => item !== null)
  if (movement.id === 'ab_wheel_rollout') return ['ab_wheel']
  return normalized
}

function loadConventionFor(movement: LegacyMovement, mode: ResistanceMode): LoadConvention {
  if (movement.id.startsWith('assisted_')) return 'assistance'
  if (mode === 'machine' || mode === 'cable') return 'device_display'
  if (mode === 'bodyweight') {
    if (
      movement.id.includes('pull_up')
      || movement.id === 'chin_up'
      || movement.id === 'dip'
    ) return 'added_to_bodyweight'
    return 'bodyweight_only'
  }
  if (mode === 'dumbbell') return 'implement_weight'
  return 'total_external'
}

function enrichMovement(movement: LegacyMovement): Movement {
  const status = movement.id in deprecatedMovementReplacements ? 'deprecated' as const : 'active' as const
  const mode = resistanceMode(movement)
  const pattern = movementPattern(movement)
  const muscles = patternMuscles[pattern]
  const replacement = deprecatedMovementReplacements[movement.id as keyof typeof deprecatedMovementReplacements] ?? null
  return {
    ...movement,
    status,
    resistanceMode: status === 'deprecated' ? null : mode,
    requiredEquipment: requiredEquipment(movement),
    pattern,
    primaryMuscles: muscles.primary,
    secondaryMuscles: muscles.secondary,
    aliases: preciseAliasById[movement.id] ?? [],
    loadConvention: loadConventionFor(movement, mode),
    replacedByMovementId: replacement,
    canonicalFreeWeightMovementId: replacement
      ? freeWeightCanonicalById[replacement] ?? replacement
      : freeWeightCanonicalById[movement.id] ?? null,
  }
}

export const movementCatalog: Record<string, Movement> = Object.fromEntries(
  Object.values({ ...legacyMovementCatalog, ...addedMovementCatalog }).map((movement) => [
    movement.id,
    enrichMovement(movement),
  ]),
)

export const defaultMovementReplacementRules: MovementReplacementRule[] = [
  accessoryRule('leg_press', 'hack_squat', 'Same squat pattern'),
  accessoryRule('leg_press', 'split_squat', 'Unilateral lower-body option'),
  accessoryRule('hamstring_curl', 'seated_leg_curl', 'Same movement pattern'),
  accessoryRule('hamstring_curl', 'lying_leg_curl', 'Same movement pattern'),
  accessoryRule('back_extension', 'reverse_hyperextension', 'Similar posterior-chain accessory'),
  accessoryRule('back_extension', 'glute_ham_raise', 'Similar posterior-chain accessory'),
  accessoryRule('cable_crunch', 'hanging_leg_raise', 'Core accessory'),
  accessoryRule('cable_crunch', 'ab_wheel_rollout', 'Core accessory'),
  accessoryRule('sit_up', 'cable_crunch', 'Core accessory'),
  accessoryRule('sit_up', 'hanging_leg_raise', 'Core accessory'),
  accessoryRule('side_bend', 'cable_crunch', 'Core accessory'),
  accessoryRule('side_bend', 'sit_up', 'Core accessory'),
  accessoryRule('ab_wheel_rollout', 'cable_crunch', 'Core accessory'),
  accessoryRule('ab_wheel_rollout', 'hanging_leg_raise', 'Core accessory'),
  accessoryRule('barbell_row', 'chest_supported_row', 'Similar row pattern'),
  accessoryRule('barbell_row', 'seated_cable_row', 'Similar row pattern'),
  accessoryRule('chest_supported_row', 'seated_cable_row', 'Similar row pattern'),
  accessoryRule('chest_supported_row', 'machine_row', 'Similar row pattern'),
  accessoryRule('t_bar_row', 'barbell_row', 'Similar row pattern'),
  accessoryRule('t_bar_row', 'chest_supported_row', 'Similar row pattern'),
  accessoryRule('pendlay_row', 'barbell_row', 'Similar row pattern'),
  accessoryRule('pendlay_row', 'chest_supported_row', 'Similar row pattern'),
  accessoryRule('lat_pulldown', 'pull_up', 'Vertical pull'),
  accessoryRule('lat_pulldown', 'machine_high_row', 'Upper-back pull'),
  accessoryRule('pull_up', 'chin_up', 'Vertical pull'),
  accessoryRule('pull_up', 'lat_pulldown', 'Vertical pull'),
  accessoryRule('chin_up', 'pull_up', 'Vertical pull'),
  accessoryRule('chin_up', 'lat_pulldown', 'Vertical pull'),
  accessoryRule('dumbbell_row', 'one_arm_cable_row', 'Unilateral row'),
  accessoryRule('dumbbell_row', 'seated_cable_row', 'Similar row pattern'),
  accessoryRule('incline_dumbbell_press', 'dumbbell_bench_press', 'Similar press'),
  accessoryRule('incline_dumbbell_press', 'push_up', 'Low-equipment press'),
  accessoryRule('barbell_curl', 'dumbbell_curl', 'Curl accessory'),
  accessoryRule('dumbbell_curl', 'barbell_curl', 'Curl accessory'),
  accessoryRule('triceps_pressdown', 'overhead_triceps_extension', 'Triceps accessory'),
  accessoryRule('triceps_pressdown', 'skullcrusher', 'Triceps accessory'),
  accessoryRule('triceps_pressdown', 'dumbbell_overhead_triceps_extension', 'Triceps accessory'),
  accessoryRule('triceps_pressdown', 'barbell_skullcrusher', 'Triceps accessory'),
  accessoryRule('rope_pressdown', 'triceps_pressdown', 'Triceps accessory'),
  accessoryRule('rope_pressdown', 'overhead_triceps_extension', 'Triceps accessory'),
  accessoryRule('jm_press', 'triceps_pressdown', 'Triceps accessory'),
  accessoryRule('jm_press', 'skullcrusher', 'Triceps accessory'),
  accessoryRule('lunge', 'split_squat', 'Unilateral lower-body option'),
  accessoryRule('lunge', 'leg_press', 'Lower-body accessory'),
  accessoryRule('upright_row', 'face_pull', 'Upper-back accessory'),
  accessoryRule('upright_row', 'rear_delt_fly', 'Rear-delt accessory'),
  accessoryRule('face_pull', 'rear_delt_fly', 'Rear-delt accessory'),
  accessoryRule('face_pull', 'machine_high_row', 'Upper-back accessory'),
  // Accessory sources introduced by the expanded template catalogue (upper/lower, ramping 5x5,
  // power+hypertrophy, weekly volume→intensity).
  accessoryRule('romanian_deadlift', 'stiff_leg_deadlift', 'Similar hinge accessory'),
  accessoryRule('romanian_deadlift', 'good_morning', 'Similar hinge accessory'),
  accessoryRule('incline_bench_press', 'incline_dumbbell_press', 'Similar incline press'),
  accessoryRule('incline_bench_press', 'dumbbell_bench_press', 'Similar press'),
  accessoryRule('front_squat', 'leg_press', 'Squat-pattern accessory'),
  accessoryRule('front_squat', 'hack_squat', 'Squat-pattern accessory'),
  accessoryRule('seated_leg_curl', 'lying_leg_curl', 'Same movement pattern'),
  accessoryRule('seated_leg_curl', 'hamstring_curl', 'Same movement pattern'),
  accessoryRule('rear_delt_fly', 'face_pull', 'Rear-delt accessory'),
  accessoryRule('rear_delt_fly', 'upright_row', 'Rear-delt accessory'),
  accessoryRule('overhead_triceps_extension', 'triceps_pressdown', 'Triceps accessory'),
  accessoryRule('overhead_triceps_extension', 'skullcrusher', 'Triceps accessory'),
  accessoryRule('hanging_leg_raise', 'cable_crunch', 'Core accessory'),
  accessoryRule('hanging_leg_raise', 'ab_wheel_rollout', 'Core accessory'),
  // Accessory sources introduced by the 5-day programme pack (close-grip bench on the bro-split arms day).
  accessoryRule('close_grip_bench_press', 'jm_press', 'Triceps press accessory'),
  accessoryRule('close_grip_bench_press', 'skullcrusher', 'Triceps press accessory'),
  variationRule('front_squat', 'pause_squat', 'Programmed squat variation'),
  variationRule('front_squat', 'safety_bar_squat', 'Programmed squat variation'),
  variationRule('pause_squat', 'front_squat', 'Programmed squat variation'),
  variationRule('pause_squat', 'safety_bar_squat', 'Programmed squat variation'),
  variationRule('close_grip_bench_press', 'board_press', 'Programmed bench variation'),
  variationRule('close_grip_bench_press', 'dumbbell_bench_press', 'Programmed bench variation'),
  variationRule('board_press', 'close_grip_bench_press', 'Programmed bench variation'),
  variationRule('board_press', 'dumbbell_bench_press', 'Programmed bench variation'),
  variationRule('romanian_deadlift', 'stiff_leg_deadlift', 'Programmed hinge variation'),
  variationRule('romanian_deadlift', 'good_morning', 'Programmed hinge variation'),
  variationRule('stiff_leg_deadlift', 'romanian_deadlift', 'Programmed hinge variation'),
  variationRule('stiff_leg_deadlift', 'good_morning', 'Programmed hinge variation'),
  variationRule('good_morning', 'romanian_deadlift', 'Programmed hinge variation'),
  variationRule('good_morning', 'stiff_leg_deadlift', 'Programmed hinge variation'),
  variationRule('low_trap_bar_deadlift', 'stiff_leg_deadlift', 'Programmed hinge variation'),
  variationRule('low_trap_bar_deadlift', 'romanian_deadlift', 'Programmed hinge variation'),
  variationRule('behind_neck_press', 'seated_pin_press', 'Programmed press variation'),
  variationRule('behind_neck_press', 'seated_dumbbell_press', 'Programmed press variation'),
  variationRule('seated_pin_press', 'behind_neck_press', 'Programmed press variation'),
  variationRule('seated_pin_press', 'seated_dumbbell_press', 'Programmed press variation'),
  variationRule('wide_grip_bench_press', 'pause_bench_press', 'Programmed bench variation'),
  variationRule('wide_grip_bench_press', 'close_grip_bench_press', 'Programmed bench variation'),
  variationRule('pause_bench_press', 'wide_grip_bench_press', 'Programmed bench variation'),
  variationRule('pause_bench_press', 'close_grip_bench_press', 'Programmed bench variation'),
  variationRule('incline_bench_press', 'floor_press', 'Programmed bench variation'),
  variationRule('incline_bench_press', 'dumbbell_bench_press', 'Programmed bench variation'),
  variationRule('floor_press', 'incline_bench_press', 'Programmed bench variation'),
  variationRule('floor_press', 'dumbbell_bench_press', 'Programmed bench variation'),
  variationRule('wide_stance_squat', 'pause_squat', 'Programmed squat variation'),
  variationRule('wide_stance_squat', 'front_squat', 'Programmed squat variation'),
  variationRule('high_box_squat', 'front_squat', 'Programmed squat variation'),
  variationRule('high_box_squat', 'safety_bar_squat', 'Programmed squat variation'),
  variationRule('wide_grip_overhead_press', 'push_press', 'Programmed press variation'),
  variationRule('wide_grip_overhead_press', 'behind_neck_press', 'Programmed press variation'),
  variationRule('push_press', 'wide_grip_overhead_press', 'Programmed press variation'),
  variationRule('push_press', 'seated_pin_press', 'Programmed press variation'),
  variationRule('standing_pin_press', 'seated_pin_press', 'Programmed press variation'),
  variationRule('standing_pin_press', 'seated_dumbbell_press', 'Programmed press variation'),
  variationRule('block_deadlift', 'romanian_deadlift', 'Programmed hinge variation'),
  variationRule('block_deadlift', 'sumo_deadlift', 'Programmed hinge variation'),
  variationRule('sumo_deadlift', 'block_deadlift', 'Programmed hinge variation'),
  variationRule('sumo_deadlift', 'stiff_leg_deadlift', 'Programmed hinge variation'),
]

function accessoryRule(sourceMovementId: string, replacementMovementId: string, relationshipLabel: string): MovementReplacementRule {
  return {
    id: `${sourceMovementId}-${replacementMovementId}-accessory`,
    sourceMovementId,
    replacementMovementId,
    role: 'accessory',
    relationshipLabel,
    allowSessionScope: true,
    allowPhaseSlotScope: true,
  }
}

function variationRule(sourceMovementId: string, replacementMovementId: string, relationshipLabel: string): MovementReplacementRule {
  return {
    id: `${sourceMovementId}-${replacementMovementId}-variation`,
    sourceMovementId,
    replacementMovementId,
    role: 'variation',
    relationshipLabel,
    allowSessionScope: true,
    allowPhaseSlotScope: true,
  }
}

export function getMovementName(movementId: string) {
  return movementCatalog[movementId]?.name ?? movementId
}

export function isActiveMovement(movement: Movement | undefined | null): movement is Movement {
  return movement?.status === 'active'
}

const freeWeightResistanceModes = ['barbell', 'dumbbell', 'specialty_bar', 'bodyweight'] as const
const maximumFreeWeightAlternatives = 3

export function isFreeWeightMovement(movement: Movement | undefined | null): boolean {
  return isActiveMovement(movement)
    && movement.resistanceMode !== null
    && freeWeightResistanceModes.includes(movement.resistanceMode as (typeof freeWeightResistanceModes)[number])
}

export type MovementCatalogFilters = {
  status?: Movement['status'] | 'all'
  resistanceModes?: ResistanceMode[]
  requiredEquipment?: RequiredEquipment[]
  patterns?: MovementPattern[]
  muscles?: MuscleGroup[]
}

export function filterMovementCatalog(
  filters: MovementCatalogFilters = {},
  catalog: Record<string, Movement> = movementCatalog,
) {
  return Object.values(catalog).filter((movement) => {
    if (filters.status !== 'all' && movement.status !== (filters.status ?? 'active')) return false
    if (filters.resistanceModes?.length && (!movement.resistanceMode || !filters.resistanceModes.includes(movement.resistanceMode))) return false
    if (filters.requiredEquipment?.length && !filters.requiredEquipment.every((item) => movement.requiredEquipment.includes(item))) return false
    if (filters.patterns?.length && !filters.patterns.includes(movement.pattern)) return false
    if (filters.muscles?.length && !filters.muscles.some((muscle) => movement.primaryMuscles.includes(muscle) || movement.secondaryMuscles.includes(muscle))) return false
    return true
  })
}

export function listActiveMovements(catalog: Record<string, Movement> = movementCatalog) {
  return filterMovementCatalog({}, catalog)
}

export function searchMovementCatalog(
  query: string,
  filters: MovementCatalogFilters = {},
  catalog: Record<string, Movement> = movementCatalog,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  return filterMovementCatalog(filters, catalog)
    .filter((movement) => {
      if (!normalizedQuery) return true
      return [movement.id.replaceAll('_', ' '), movement.name, ...movement.aliases]
        .some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
    })
    .sort((left, right) => left.name.localeCompare(right.name))
}

export function freeWeightAlternativesFor(
  movementId: string,
  catalog: Record<string, Movement> = movementCatalog,
) {
  const movement = catalog[movementId]
  if (!movement) return []

  const candidates = listActiveMovements(catalog)
    .filter((candidate) => candidate.id !== movementId && isFreeWeightMovement(candidate))
    .filter((candidate) => candidate.pattern === movement.pattern)
    .sort((left, right) => {
      const leftMode = freeWeightResistanceModes.indexOf(left.resistanceMode as (typeof freeWeightResistanceModes)[number])
      const rightMode = freeWeightResistanceModes.indexOf(right.resistanceMode as (typeof freeWeightResistanceModes)[number])
      if (leftMode !== rightMode) return leftMode - rightMode
      return left.name.localeCompare(right.name)
    })

  const canonicalId = movement.canonicalFreeWeightMovementId
  if (canonicalId) {
    const canonical = catalog[canonicalId]
    // The canonical mapping is a curated exception and is authoritative when
    // an exact movement-pattern equivalent does not exist (for example, a
    // free-weight quad substitute for leg extension).
    if (canonical && isFreeWeightMovement(canonical)) {
      candidates.unshift(canonical)
    }
  }

  return Array.from(new Map(candidates.map((candidate) => [candidate.id, candidate])).values())
    .slice(0, maximumFreeWeightAlternatives)
}

export const freeWeightPolicyV1 = {
  id: '00000000-0000-4000-8000-000000000201',
  version: '1' as const,
  checksum: 'd1a7e4203f2807c1a2ec9efe947d371e',
  // Deprecated aliases remain valid in immutable, already-pinned template
  // definitions. Keep explicit migration rules for them while excluding them
  // from every discovery surface.
  rules: Object.values(movementCatalog)
    .filter((movement) => !isFreeWeightMovement(movement))
    .map((movement) => ({
      id: `free-weight-v1-${movement.id}`,
      sourceMovementId: movement.id,
      replacementMovementIds: freeWeightAlternativesFor(movement.id).map((candidate) => candidate.id),
      loadHandling: 'clear' as const,
    }))
    .filter((rule) => rule.replacementMovementIds.length > 0),
}

/** Movements whose default logged load is bodyweight rather than external resistance. */
export function defaultsToBodyweightLoad(
  movementId: string,
  catalog: Record<string, Movement> = movementCatalog,
) {
  const loadConvention = catalog[movementId]?.loadConvention
  return loadConvention === 'bodyweight_only' || loadConvention === 'added_to_bodyweight'
}

export function listMovementAlternatives(movementId: string) {
  const movement = movementCatalog[movementId]
  if (!movement) return listActiveMovements()
  return Object.values(movementCatalog).filter((candidate) => {
    if (candidate.id === movementId || !isActiveMovement(candidate)) return false
    return (
      candidate.category === movement.category ||
      (Boolean(candidate.variationOf) && candidate.variationOf === movement.variationOf) ||
      candidate.variationOf === movement.id ||
      movement.variationOf === candidate.id
    )
  })
}

export function buildMovementSwapOptions({
  movementId,
  role,
  templateId,
  phaseKey,
  slotId,
  rules = defaultMovementReplacementRules,
  catalog = movementCatalog,
}: {
  movementId: string
  role: MovementRole
  templateId?: string | null
  phaseKey?: string | null
  slotId?: string | null
  rules?: MovementReplacementRule[]
  catalog?: Record<string, Movement>
}): MovementSwapOption[] {
  if (role === 'main') return []

  const options = new Map<string, MovementSwapOption>()
  const matchingRules = rules.filter((rule) => {
    if (rule.sourceMovementId !== movementId) return false
    if (rule.role && rule.role !== role) return false
    if (rule.templateId && rule.templateId !== templateId) return false
    if (rule.phaseKey && rule.phaseKey !== phaseKey) return false
    if (rule.slotId && rule.slotId !== slotId) return false
    return true
  })

  for (const rule of matchingRules) {
    const movement = catalog[rule.replacementMovementId]
    if (!isActiveMovement(movement) || movement.id === movementId || movement.isCompetition) continue
    const allowedScopes = [
      rule.allowSessionScope ? 'session' as const : null,
      rule.allowPhaseSlotScope ? 'phase_slot' as const : null,
    ].filter((scope): scope is 'session' | 'phase_slot' => scope !== null)
    if (!allowedScopes.length) continue
    options.set(movement.id, {
      movementId: movement.id,
      movementName: movement.name,
      category: movement.category,
      equipment: movement.equipment,
      requiredEquipment: movement.requiredEquipment,
      relationshipLabel: rule.relationshipLabel,
      source: 'rule',
      ruleId: rule.id,
      allowedScopes,
      freeWeightCompatible: isFreeWeightMovement(movement),
    })
  }

  if (role === 'accessory') {
    const movement = catalog[movementId]
    if (!movement) return Array.from(options.values())
    for (const candidate of listMovementAlternativesFromCatalog(movementId, catalog)) {
      if (candidate.isCompetition || options.has(candidate.id)) continue
      options.set(candidate.id, {
        movementId: candidate.id,
        movementName: candidate.name,
        category: candidate.category,
        equipment: candidate.equipment,
        requiredEquipment: candidate.requiredEquipment,
        relationshipLabel: relationshipLabel(movement, candidate),
        source: 'catalog',
        allowedScopes: ['session'],
        freeWeightCompatible: isFreeWeightMovement(candidate),
      })
    }
  }

  return Array.from(options.values())
}

function listMovementAlternativesFromCatalog(movementId: string, catalog: Record<string, Movement>) {
  const movement = catalog[movementId]
  if (!movement) return listActiveMovements(catalog)
  return Object.values(catalog).filter((candidate) => {
    if (candidate.id === movementId || !isActiveMovement(candidate)) return false
    return (
      candidate.category === movement.category ||
      (Boolean(candidate.variationOf) && candidate.variationOf === movement.variationOf) ||
      candidate.variationOf === movement.id ||
      movement.variationOf === candidate.id
    )
  })
}

function relationshipLabel(movement: Movement, candidate: Movement) {
  if (candidate.variationOf && candidate.variationOf === movement.variationOf) return 'Same main-lift family'
  if (candidate.category === movement.category) return 'Same category'
  if (candidate.equipment.some((item) => movement.equipment.includes(item))) return 'Shared equipment'
  return 'Related movement'
}
