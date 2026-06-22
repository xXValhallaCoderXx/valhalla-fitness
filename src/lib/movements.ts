import type { Movement, MovementReplacementRule, MovementRole, MovementSwapOption } from '~/types/training'

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

export const defaultMovementReplacementRules: MovementReplacementRule[] = [
  accessoryRule('leg_press', 'hack_squat', 'Same squat pattern'),
  accessoryRule('leg_press', 'split_squat', 'Unilateral lower-body option'),
  accessoryRule('hamstring_curl', 'seated_leg_curl', 'Same movement pattern'),
  accessoryRule('hamstring_curl', 'lying_leg_curl', 'Same movement pattern'),
  accessoryRule('back_extension', 'reverse_hyperextension', 'Similar posterior-chain accessory'),
  accessoryRule('back_extension', 'glute_ham_raise', 'Similar posterior-chain accessory'),
  accessoryRule('cable_crunch', 'hanging_leg_raise', 'Core accessory'),
  accessoryRule('cable_crunch', 'ab_wheel_rollout', 'Core accessory'),
  accessoryRule('chest_supported_row', 'seated_cable_row', 'Similar row pattern'),
  accessoryRule('chest_supported_row', 'machine_row', 'Similar row pattern'),
  accessoryRule('lat_pulldown', 'pull_up', 'Vertical pull'),
  accessoryRule('lat_pulldown', 'machine_high_row', 'Upper-back pull'),
  accessoryRule('dumbbell_row', 'one_arm_cable_row', 'Unilateral row'),
  accessoryRule('dumbbell_row', 'seated_cable_row', 'Similar row pattern'),
  accessoryRule('incline_dumbbell_press', 'dumbbell_bench_press', 'Similar press'),
  accessoryRule('incline_dumbbell_press', 'push_up', 'Low-equipment press'),
  accessoryRule('triceps_pressdown', 'overhead_triceps_extension', 'Triceps accessory'),
  accessoryRule('triceps_pressdown', 'skullcrusher', 'Triceps accessory'),
  accessoryRule('face_pull', 'rear_delt_fly', 'Rear-delt accessory'),
  accessoryRule('face_pull', 'machine_high_row', 'Upper-back accessory'),
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
  variationRule('low_trap_bar_deadlift', 'stiff_leg_deadlift', 'Programmed hinge variation'),
  variationRule('low_trap_bar_deadlift', 'romanian_deadlift', 'Programmed hinge variation'),
  variationRule('behind_neck_press', 'seated_pin_press', 'Programmed press variation'),
  variationRule('behind_neck_press', 'seated_dumbbell_press', 'Programmed press variation'),
  variationRule('seated_pin_press', 'behind_neck_press', 'Programmed press variation'),
  variationRule('seated_pin_press', 'seated_dumbbell_press', 'Programmed press variation'),
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
    if (!movement || movement.id === movementId || movement.isCompetition) continue
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
      relationshipLabel: rule.relationshipLabel,
      source: 'rule',
      ruleId: rule.id,
      allowedScopes,
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
        relationshipLabel: relationshipLabel(movement, candidate),
        source: 'catalog',
        allowedScopes: ['session'],
      })
    }
  }

  return Array.from(options.values())
}

function listMovementAlternativesFromCatalog(movementId: string, catalog: Record<string, Movement>) {
  const movement = catalog[movementId]
  if (!movement) return Object.values(catalog)
  return Object.values(catalog).filter((candidate) => {
    if (candidate.id === movementId) return false
    return (
      candidate.category === movement.category ||
      candidate.variationOf === movement.variationOf ||
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
