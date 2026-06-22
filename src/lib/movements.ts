import type { Movement } from '~/types/training'

export const movementCatalog: Record<string, Movement> = {
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
  leg_press: {
    id: 'leg_press',
    name: 'Leg Press',
    category: 'lower',
    equipment: ['machine'],
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
  back_extension: {
    id: 'back_extension',
    name: 'Back Extension',
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
  dumbbell_row: {
    id: 'dumbbell_row',
    name: 'Dumbbell Row',
    category: 'upper_back',
    equipment: ['dumbbells', 'bench'],
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
  triceps_pressdown: {
    id: 'triceps_pressdown',
    name: 'Triceps Pressdown',
    category: 'upper',
    equipment: ['cable'],
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
}

export function getMovementName(movementId: string) {
  return movementCatalog[movementId]?.name ?? movementId
}

export function listMovementAlternatives(movementId: string) {
  const movement = movementCatalog[movementId]
  if (!movement) return Object.values(movementCatalog)
  return Object.values(movementCatalog).filter((candidate) => {
    if (candidate.id === movementId) return false
    return (
      candidate.category === movement.category ||
      candidate.variationOf === movement.variationOf ||
      candidate.variationOf === movement.id ||
      movement.variationOf === candidate.id
    )
  })
}
