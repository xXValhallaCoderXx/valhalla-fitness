import { programStateKey, type TemplateDefinition, type TemplateSetDefinition } from '~/domains/program/lib/template-engine'

const mainLiftIds = ['squat', 'bench_press', 'deadlift', 'overhead_press'] as const
const alternating5x5MovementIds = ['squat', 'bench_press', 'overhead_press', 'deadlift', 'barbell_row'] as const

type LoadDefault = 'low' | 'high' | 'blank'

function percent(percent: number, percentMax?: number, defaultLoad: LoadDefault = 'low') {
  return { kind: 'percent_of_state' as const, stateType: 'training_max' as const, percent, percentMax, default: defaultLoad }
}

function workingLoad() {
  return { kind: 'state' as const, stateType: 'working_load' as const }
}

function fixed(kg: number, lb?: number) {
  return { kind: 'fixed' as const, kg, lb }
}

function userSelected() {
  return { kind: 'user_selected' as const }
}

function repeatedSets(
  count: number,
  base: Omit<TemplateSetDefinition, 'label'> & { label?: string },
  topSet = false,
) {
  return Array.from({ length: count }, (_, index): TemplateSetDefinition => ({
    ...base,
    isTopSet: topSet && index === count - 1,
    isAmrap: Boolean(base.isAmrap || (topSet && index === count - 1)),
    label: topSet && index === count - 1 && base.targetReps ? `${base.targetReps}+` : base.label,
  }))
}

function accessoryPrescription(sets: number, repMin: number, repMax: number, kg?: number) {
  return {
    targetSummary: `${sets} sets x ${repMin}-${repMax} reps @ RIR 2`,
    progressionRuleId: 'accessory_double_progression',
    sets: repeatedSets(sets, {
      targetLoad: typeof kg === 'number' ? fixed(kg) : userSelected(),
      targetRepMin: repMin,
      targetRepMax: repMax,
      targetRir: 2,
      label: `${repMin}-${repMax}`,
    }),
  }
}

function fiveByFivePrescription() {
  return {
    targetSummary: '5x5 @ current working load',
    progressionRuleId: 'simple_linear_completion',
    sets: repeatedSets(5, {
      targetLoad: workingLoad(),
      targetReps: 5,
      label: '5',
    }),
  }
}

function oneByFivePrescription() {
  return {
    targetSummary: '1x5 @ current working load',
    progressionRuleId: 'simple_linear_completion',
    sets: repeatedSets(1, {
      targetLoad: workingLoad(),
      targetReps: 5,
      label: '5',
    }),
  }
}

function alternating5x5Sessions(): TemplateDefinition['sessions'] {
  return [
    alternating5x5Session('day-1', 'Day 1'),
    alternating5x5Session('day-2', 'Day 2'),
    alternating5x5Session('day-3', 'Day 3'),
  ]
}

function alternating5x5Session(id: string, title: string): TemplateDefinition['sessions'][number] {
  const isMiddleSession = id === 'day-2'
  const accessories = isMiddleSession
    ? [
        ['accessory-1', 'lat_pulldown', 'vertical-pull'],
        ['accessory-2', 'sit_up', 'trunk-assistance'],
      ] as const
    : id === 'day-1'
      ? [
          ['accessory-1', 'chin_up', 'vertical-pull'],
          ['accessory-2', 'back_extension', 'trunk-assistance'],
        ] as const
      : [
          ['accessory-1', 'pull_up', 'vertical-pull'],
          ['accessory-2', 'cable_crunch', 'trunk-assistance'],
        ] as const
  return {
    id,
    title,
    estimatedMinutes: isMiddleSession ? 65 : 70,
    slots: [
      {
        id: 'squat',
        role: 'main',
        movementId: 'squat',
        prescriptionId: 'five-by-five',
      },
      {
        id: 'push',
        role: 'main',
        movementId: isMiddleSession
          ? { default: 'overhead_press', byPhase: { starts_with_b: 'bench_press' } }
          : { default: 'bench_press', byPhase: { starts_with_b: 'overhead_press' } },
        prescriptionId: 'five-by-five',
      },
      {
        id: 'pull',
        role: 'main',
        movementId: isMiddleSession
          ? { default: 'deadlift', byPhase: { starts_with_b: 'barbell_row' } }
          : { default: 'barbell_row', byPhase: { starts_with_b: 'deadlift' } },
        prescriptionId: isMiddleSession ? 'middle-pull' : 'outer-pull',
      },
      ...accessories.map(([slotId, movementId, prescriptionId]) => ({
        id: slotId,
        role: 'accessory' as const,
        movementId,
        prescriptionId,
      })),
    ],
  }
}

function alternating5x5Weeks(): TemplateDefinition['weeks'] {
  return [
    {
      label: 'Week 1',
      phaseKey: 'starts_with_a',
      phaseLabel: 'Starts with A',
      summary: 'A/B/A rotation using squat every day, bench and row on A, overhead press and deadlift on B.',
      hardness: 'Medium',
      prescriptions: {
        'five-by-five': fiveByFivePrescription(),
        'outer-pull': fiveByFivePrescription(),
        'middle-pull': oneByFivePrescription(),
        'vertical-pull': accessoryPrescription(3, 6, 10),
        'trunk-assistance': accessoryPrescription(3, 10, 15),
      },
    },
    {
      label: 'Week 2',
      phaseKey: 'starts_with_b',
      phaseLabel: 'Starts with B',
      summary: 'B/A/B rotation so the alternating sequence stays continuous across weeks.',
      hardness: 'Medium',
      prescriptions: {
        'five-by-five': fiveByFivePrescription(),
        'outer-pull': oneByFivePrescription(),
        'middle-pull': fiveByFivePrescription(),
        'vertical-pull': accessoryPrescription(3, 6, 10),
        'trunk-assistance': accessoryPrescription(3, 10, 15),
      },
    },
  ]
}

/** Generic straight-set working-load LP prescription (generalises the 5x5/1x5 helpers). */
function workingLoadPrescription(sets: number, reps: number) {
  return {
    targetSummary: `${sets}x${reps} @ current working load`,
    progressionRuleId: 'simple_linear_completion',
    sets: repeatedSets(sets, {
      targetLoad: workingLoad(),
      targetReps: reps,
      label: String(reps),
    }),
  }
}

/** Movement-specific linear increments shared by the working-load LP templates. */
const linearIncrements = {
  squat: { kg: 2.5, lb: 5 },
  bench_press: { kg: 2.5, lb: 5 },
  overhead_press: { kg: 2.5, lb: 5 },
  deadlift: { kg: 5, lb: 10 },
  barbell_row: { kg: 2.5, lb: 5 },
}

const beginnerUpperLowerMovementIds = ['squat', 'bench_press', 'deadlift', 'overhead_press', 'barbell_row'] as const

function beginnerUpperLowerSessions(): TemplateDefinition['sessions'] {
  const main = (id: string, movementId: string) => ({ id, role: 'main' as const, movementId, prescriptionId: 'main' })
  const acc = (id: string, movementId: string, prescriptionId: string) => ({ id, role: 'accessory' as const, movementId, prescriptionId })
  return [
    {
      id: 'upper-a',
      title: 'Upper A',
      estimatedMinutes: 60,
      slots: [
        main('bench', 'bench_press'),
        main('row', 'barbell_row'),
        acc('lat', 'lat_pulldown', 'vertical-pull'),
        acc('incline', 'incline_dumbbell_press', 'compound-accessory'),
        acc('triceps', 'triceps_pressdown', 'isolation'),
      ],
    },
    {
      id: 'lower-a',
      title: 'Lower A',
      estimatedMinutes: 60,
      slots: [
        main('squat', 'squat'),
        acc('rdl', 'romanian_deadlift', 'hinge-accessory'),
        acc('legpress', 'leg_press', 'compound-accessory'),
        acc('crunch', 'cable_crunch', 'core'),
      ],
    },
    {
      id: 'upper-b',
      title: 'Upper B',
      estimatedMinutes: 60,
      slots: [
        main('press', 'overhead_press'),
        acc('pullup', 'pull_up', 'vertical-pull'),
        acc('inclinebb', 'incline_bench_press', 'compound-accessory'),
        acc('dbrow', 'dumbbell_row', 'compound-accessory'),
        acc('curl', 'barbell_curl', 'isolation'),
      ],
    },
    {
      id: 'lower-b',
      title: 'Lower B',
      estimatedMinutes: 60,
      slots: [
        main('deadlift', 'deadlift'),
        acc('frontsquat', 'front_squat', 'compound-accessory'),
        acc('legcurl', 'seated_leg_curl', 'isolation'),
        acc('backext', 'back_extension', 'core'),
      ],
    },
  ]
}

function beginnerUpperLowerWeeks(): TemplateDefinition['weeks'] {
  return [
    {
      label: 'Week 1',
      phaseKey: 'lp',
      phaseLabel: 'Linear progression',
      summary: 'Two upper and two lower days. Add weight to the main lifts whenever you complete every set.',
      hardness: 'Medium',
      prescriptions: {
        main: workingLoadPrescription(3, 5),
        'vertical-pull': accessoryPrescription(3, 6, 10),
        'hinge-accessory': accessoryPrescription(3, 8, 12),
        'compound-accessory': accessoryPrescription(3, 8, 12),
        isolation: accessoryPrescription(3, 10, 15),
        core: accessoryPrescription(3, 12, 20),
      },
    },
  ]
}

function percentWorkingLoad(percentValue: number) {
  return { kind: 'percent_of_state' as const, stateType: 'working_load' as const, percent: percentValue, default: 'low' as const }
}

/** Straight sets at a fixed percentage of the working load (no auto-progression — volume/recovery work). */
function workingLoadPercentPrescription(sets: number, reps: number, percentValue: number) {
  return {
    targetSummary: `${sets}x${reps} @ ~${Math.round(percentValue * 100)}% working load`,
    sets: repeatedSets(sets, { targetLoad: percentWorkingLoad(percentValue), targetReps: reps, label: String(reps) }),
  }
}

/** Ascending ramp sets up to one top set at the working load; the top set drives weekly LP. */
function rampToTopPrescription(rampPercents: number[], topReps: number) {
  return {
    targetSummary: `Ramp to a top set of ${topReps} at the working load`,
    progressionRuleId: 'simple_linear_completion',
    sets: [
      ...rampPercents.map((p): TemplateSetDefinition => ({ targetLoad: percentWorkingLoad(p), targetReps: topReps, label: String(topReps) })),
      { targetLoad: workingLoad(), targetReps: topReps, isTopSet: true, label: String(topReps) },
    ],
  }
}

// --- Ramping 5x5 (intermediate, weekly LP) -------------------------------------------------
const ramping5x5MovementIds = ['squat', 'bench_press', 'deadlift', 'overhead_press', 'barbell_row'] as const

function ramping5x5Sessions(): TemplateDefinition['sessions'] {
  return [
    {
      id: 'heavy',
      title: 'Heavy Day',
      estimatedMinutes: 65,
      slots: [
        { id: 'squat', role: 'main', movementId: 'squat', prescriptionId: 'ramp-top' },
        { id: 'bench', role: 'main', movementId: 'bench_press', prescriptionId: 'ramp-top' },
        { id: 'row', role: 'main', movementId: 'barbell_row', prescriptionId: 'ramp-top' },
        { id: 'chins', role: 'accessory', movementId: 'chin_up', prescriptionId: 'vertical-pull' },
      ],
    },
    {
      id: 'recovery',
      title: 'Recovery Day',
      estimatedMinutes: 55,
      slots: [
        { id: 'squat', role: 'main', movementId: 'squat', prescriptionId: 'light' },
        { id: 'press', role: 'main', movementId: 'overhead_press', prescriptionId: 'ramp-top' },
        { id: 'deadlift', role: 'main', movementId: 'deadlift', prescriptionId: 'ramp-deadlift' },
        { id: 'core', role: 'accessory', movementId: 'cable_crunch', prescriptionId: 'core' },
      ],
    },
    {
      id: 'volume',
      title: 'Volume Day',
      estimatedMinutes: 65,
      slots: [
        { id: 'squat', role: 'main', movementId: 'squat', prescriptionId: 'volume' },
        { id: 'bench', role: 'main', movementId: 'bench_press', prescriptionId: 'volume' },
        { id: 'row', role: 'main', movementId: 'barbell_row', prescriptionId: 'volume' },
        { id: 'chins', role: 'accessory', movementId: 'chin_up', prescriptionId: 'vertical-pull' },
      ],
    },
  ]
}

function ramping5x5Weeks(): TemplateDefinition['weeks'] {
  return [
    {
      label: 'Week 1',
      phaseKey: 'ramp',
      phaseLabel: 'Weekly ramp',
      summary: 'A heavy ramp day, a lighter recovery day, and a volume day. Add weight to your top sets each week.',
      hardness: 'Hard',
      prescriptions: {
        'ramp-top': rampToTopPrescription([0.5, 0.625, 0.75, 0.875], 5),
        'ramp-deadlift': rampToTopPrescription([0.6, 0.8], 5),
        light: workingLoadPercentPrescription(4, 5, 0.8),
        volume: workingLoadPercentPrescription(5, 5, 0.9),
        'vertical-pull': accessoryPrescription(3, 6, 10),
        core: accessoryPrescription(3, 12, 20),
      },
    },
  ]
}

// --- Power + Hypertrophy Upper/Lower (intermediate powerbuilding) ---------------------------
const powerHypertrophyMovementIds = ['squat', 'bench_press', 'deadlift', 'overhead_press', 'barbell_row'] as const

function powerHypertrophySessions(): TemplateDefinition['sessions'] {
  return [
    {
      id: 'power-upper',
      title: 'Power Upper',
      estimatedMinutes: 65,
      slots: [
        { id: 'bench', role: 'main', movementId: 'bench_press', prescriptionId: 'power' },
        { id: 'press', role: 'main', movementId: 'overhead_press', prescriptionId: 'power' },
        { id: 'row', role: 'main', movementId: 'barbell_row', prescriptionId: 'power' },
        { id: 'pullup', role: 'accessory', movementId: 'pull_up', prescriptionId: 'vertical-pull' },
        { id: 'triceps', role: 'accessory', movementId: 'triceps_pressdown', prescriptionId: 'isolation' },
      ],
    },
    {
      id: 'power-lower',
      title: 'Power Lower',
      estimatedMinutes: 65,
      slots: [
        { id: 'squat', role: 'main', movementId: 'squat', prescriptionId: 'power' },
        { id: 'deadlift', role: 'main', movementId: 'deadlift', prescriptionId: 'power' },
        { id: 'legpress', role: 'accessory', movementId: 'leg_press', prescriptionId: 'compound-accessory' },
        { id: 'core', role: 'accessory', movementId: 'cable_crunch', prescriptionId: 'core' },
      ],
    },
    {
      id: 'hyper-upper',
      title: 'Hypertrophy Upper',
      estimatedMinutes: 60,
      slots: [
        { id: 'incline', role: 'accessory', movementId: 'incline_dumbbell_press', prescriptionId: 'compound-accessory' },
        { id: 'row', role: 'accessory', movementId: 'chest_supported_row', prescriptionId: 'compound-accessory' },
        { id: 'reardelt', role: 'accessory', movementId: 'rear_delt_fly', prescriptionId: 'isolation' },
        { id: 'curl', role: 'accessory', movementId: 'barbell_curl', prescriptionId: 'isolation' },
        { id: 'triceps', role: 'accessory', movementId: 'overhead_triceps_extension', prescriptionId: 'isolation' },
      ],
    },
    {
      id: 'hyper-lower',
      title: 'Hypertrophy Lower',
      estimatedMinutes: 60,
      slots: [
        { id: 'frontsquat', role: 'accessory', movementId: 'front_squat', prescriptionId: 'compound-accessory' },
        { id: 'rdl', role: 'accessory', movementId: 'romanian_deadlift', prescriptionId: 'compound-accessory' },
        { id: 'legcurl', role: 'accessory', movementId: 'seated_leg_curl', prescriptionId: 'isolation' },
        { id: 'legraise', role: 'accessory', movementId: 'hanging_leg_raise', prescriptionId: 'core' },
      ],
    },
  ]
}

function powerHypertrophyWeeks(): TemplateDefinition['weeks'] {
  return [
    {
      label: 'Week 1',
      phaseKey: 'pwr-hyp',
      phaseLabel: 'Power + hypertrophy',
      summary: 'Two heavy power days that add weight weekly, plus two higher-rep hypertrophy days.',
      hardness: 'Hard',
      prescriptions: {
        power: workingLoadPrescription(3, 5),
        'vertical-pull': accessoryPrescription(3, 6, 10),
        'compound-accessory': accessoryPrescription(3, 8, 12),
        isolation: accessoryPrescription(3, 10, 15),
        core: accessoryPrescription(3, 12, 20),
      },
    },
  ]
}

// --- 3-Day Strength: Volume to Intensity (advanced, weekly progression) ---------------------
const weeklyIntensityMovementIds = ['squat', 'bench_press', 'deadlift', 'overhead_press'] as const

function weeklyIntensitySessions(): TemplateDefinition['sessions'] {
  return [
    {
      id: 'volume',
      title: 'Volume Day',
      estimatedMinutes: 70,
      slots: [
        { id: 'squat', role: 'main', movementId: 'squat', prescriptionId: 'volume' },
        { id: 'bench', role: 'main', movementId: 'bench_press', prescriptionId: 'volume' },
        { id: 'row', role: 'accessory', movementId: 'barbell_row', prescriptionId: 'compound-accessory' },
      ],
    },
    {
      id: 'recovery',
      title: 'Recovery Day',
      estimatedMinutes: 55,
      slots: [
        { id: 'squat', role: 'main', movementId: 'squat', prescriptionId: 'light' },
        { id: 'press', role: 'main', movementId: 'overhead_press', prescriptionId: 'intensity' },
        { id: 'chins', role: 'accessory', movementId: 'chin_up', prescriptionId: 'vertical-pull' },
      ],
    },
    {
      id: 'intensity',
      title: 'Intensity Day',
      estimatedMinutes: 65,
      slots: [
        { id: 'squat', role: 'main', movementId: 'squat', prescriptionId: 'intensity' },
        { id: 'bench', role: 'main', movementId: 'bench_press', prescriptionId: 'intensity' },
        { id: 'deadlift', role: 'main', movementId: 'deadlift', prescriptionId: 'intensity' },
      ],
    },
  ]
}

function weeklyIntensityWeeks(): TemplateDefinition['weeks'] {
  return [
    {
      label: 'Week 1',
      phaseKey: 'weekly',
      phaseLabel: 'Weekly progression',
      summary: 'A high-volume day, a lighter recovery day, and an intensity day chasing a new top set each week.',
      hardness: 'Hard',
      prescriptions: {
        volume: workingLoadPercentPrescription(5, 5, 0.9),
        light: workingLoadPercentPrescription(2, 5, 0.8),
        intensity: rampToTopPrescription([0.6, 0.8], 5),
        'compound-accessory': accessoryPrescription(3, 8, 12),
        'vertical-pull': accessoryPrescription(3, 6, 10),
      },
    },
  ]
}

function requiredTrainingMaxState(): TemplateDefinition['requiredState'] {
  return mainLiftIds.map((movementId) => ({
    key: programStateKey(movementId, 'training_max'),
    movementId,
    type: 'training_max',
  }))
}

function requiredWorkingLoadState(movementIds: readonly string[]): TemplateDefinition['requiredState'] {
  return movementIds.map((movementId) => ({
    key: programStateKey(movementId, 'working_load'),
    movementId,
    type: 'working_load',
  }))
}

function trainingMaxWaveWeeks(): TemplateDefinition['weeks'] {
  const weeks = [
    {
      label: 'Week 1',
      phaseKey: 'cycle',
      phaseLabel: '5s week',
      summary: '65%x5, 75%x5, 85%x5+ with back-off 5x5.',
      hardness: 'Medium' as const,
      sets: [
        { targetLoad: percent(0.65), targetReps: 5, label: '5' },
        { targetLoad: percent(0.75), targetReps: 5, label: '5' },
        { targetLoad: percent(0.85), targetReps: 5, targetRir: 2, isTopSet: true, isAmrap: true, label: '5+' },
        ...repeatedSets(5, { targetLoad: percent(0.65), targetReps: 5, targetRir: 2, isBackoff: true, label: 'Back-off' }),
      ],
      targetSummary: '65%x5 · 75%x5 · 85%x5+ · back-off 5x5',
    },
    {
      label: 'Week 2',
      phaseKey: 'cycle',
      phaseLabel: '3s week',
      summary: '70%x3, 80%x3, 90%x3+ with back-off 5x5.',
      hardness: 'Medium' as const,
      sets: [
        { targetLoad: percent(0.7), targetReps: 3, label: '3' },
        { targetLoad: percent(0.8), targetReps: 3, label: '3' },
        { targetLoad: percent(0.9), targetReps: 3, targetRir: 2, isTopSet: true, isAmrap: true, label: '3+' },
        ...repeatedSets(5, { targetLoad: percent(0.65), targetReps: 5, targetRir: 2, isBackoff: true, label: 'Back-off' }),
      ],
      targetSummary: '70%x3 · 80%x3 · 90%x3+ · back-off 5x5',
    },
    {
      label: 'Week 3',
      phaseKey: 'cycle',
      phaseLabel: 'Peak week',
      summary: '75%x5, 85%x3, 95%x1+ with back-off 5x5.',
      hardness: 'Hard' as const,
      sets: [
        { targetLoad: percent(0.75), targetReps: 5, label: '5' },
        { targetLoad: percent(0.85), targetReps: 3, label: '3' },
        { targetLoad: percent(0.95), targetReps: 1, targetRir: 2, isTopSet: true, isAmrap: true, label: '1+' },
        ...repeatedSets(5, { targetLoad: percent(0.65), targetReps: 5, targetRir: 2, isBackoff: true, label: 'Back-off' }),
      ],
      targetSummary: '75%x5 · 85%x3 · 95%x1+ · back-off 5x5',
    },
    {
      label: 'Week 4',
      phaseKey: 'cycle',
      phaseLabel: 'Deload',
      summary: '40%x5, 50%x5, 60%x5 deload work without back-off sets.',
      hardness: 'Deload' as const,
      sets: [
        { targetLoad: percent(0.4), targetReps: 5, label: '5' },
        { targetLoad: percent(0.5), targetReps: 5, label: '5' },
        { targetLoad: percent(0.6), targetReps: 5, label: '5' },
      ],
      targetSummary: '40%x5 · 50%x5 · 60%x5',
    },
  ]

  return weeks.map((week) => ({
    label: week.label,
    phaseKey: week.phaseKey,
    phaseLabel: week.phaseLabel,
    summary: week.summary,
    hardness: week.hardness,
    prescriptions: {
      main: {
        targetSummary: week.targetSummary,
        progressionRuleId: 'training_max_band',
        sets: week.sets,
      },
      'accessory-1': accessoryPrescription(4, 8, 12, 55),
      'accessory-2': accessoryPrescription(4, 8, 12, 40),
      'accessory-3': accessoryPrescription(4, 8, 12, 25),
    },
  }))
}

function plusSetWaveWeeks(): TemplateDefinition['weeks'] {
  return Array.from({ length: 18 }, (_, weekIndex) => {
    const isPeak = weekIndex >= 9
    const phaseKey = isPeak ? 'peak' : 'base'
    const phaseLabel = isPeak ? 'Peak phase' : 'Base phase'
    const phaseWeekIndex = weekIndex % 9
    const waveIndex = Math.floor(phaseWeekIndex / 3)
    const weekInWave = phaseWeekIndex % 3
    const mainReps = isPeak ? [3, 2, 1][waveIndex] : [6, 5, 4][waveIndex]
    const mainPercent = isPeak ? [0.85, 0.88, 0.92][waveIndex] : [0.7, 0.75, 0.8][waveIndex]
    const mainSetCount = isPeak ? [5, 3, 1][weekInWave] : 4
    const variationPercent = isPeak ? [0.75, 0.8, 0.85][waveIndex] : [0.6, 0.65, 0.7][waveIndex]
    const variationSetCount = isPeak ? [4, 3, 2][weekInWave] : [3, 4, 5][weekInWave]
    const variationReps = isPeak ? [6, 5, 4][waveIndex] : [12, 10, 8][waveIndex]
    const mainPercentLabel = Math.round(mainPercent * 100)
    const variationPercentLabel = Math.round(variationPercent * 100)

    return {
      label: `Week ${weekInWave + 1}`,
      phaseKey,
      phaseLabel,
      waveLabel: `Wave ${waveIndex + 1}`,
      summary: `${mainSetCount}x${mainReps}+ main work around ${mainPercentLabel}% with ${variationSetCount}x${variationReps} variation work around ${variationPercentLabel}%.`,
      hardness: weekInWave === 2 ? 'Hard' : weekInWave === 1 ? 'Medium' : 'Light',
      prescriptions: {
        main: {
          targetSummary: `${mainSetCount} sets x ${mainReps}+ @ ${mainPercentLabel}%`,
          progressionRuleId: 'plus_set_wave',
          sets: repeatedSets(
            mainSetCount,
            {
              targetLoad: percent(mainPercent),
              targetReps: mainReps,
              targetRir: 2,
              label: `${mainReps}`,
            },
            true,
          ).map((set, index, sets) => ({
            ...set,
            targetRir: index === sets.length - 1 ? 0 : 2,
          })),
        },
        variation: {
          targetSummary: `${variationSetCount} sets x ${variationReps} @ ${variationPercentLabel}%`,
          progressionRuleId: 'wave_step_load',
          sets: repeatedSets(variationSetCount, {
            targetLoad: percent(variationPercent),
            targetReps: variationReps,
            targetRir: isPeak ? 3 : 6,
            label: `${variationReps}`,
          }),
        },
        'accessory-1': accessoryPrescription(3, 10, 15, 55),
        'accessory-2': accessoryPrescription(3, 10, 15, 40),
      },
    }
  })
}

function seventiesWeeks(): TemplateDefinition['weeks'] {
  return Array.from({ length: 18 }, (_, weekIndex) => {
    const isPeak = weekIndex >= 9
    const phaseKey = isPeak ? 'peak' : 'base'
    const phaseLabel = isPeak ? 'Peak phase' : 'Base phase'
    const phaseWeekIndex = weekIndex % 9
    const waveIndex = Math.floor(phaseWeekIndex / 3)
    const weekInWave = phaseWeekIndex % 3

    if (!isPeak) {
      const mainReps = [10, 8, 5][waveIndex]
      const mainSets = [3, 4, 5][weekInWave]
      const low = [0.6, 0.65, 0.7][waveIndex]
      const high = weekInWave === 0 ? undefined : roundPercent(low + (weekInWave === 1 ? 0.05 : 0.1))
      const variationReps = [10, 8, 6][waveIndex]
      const variationSetsByWave = [
        [2, 3, 4],
        [2, 3, 4],
        [3, 4, 5],
      ]
      const variationSets = variationSetsByWave[waveIndex]?.[weekInWave] ?? 3
      const accessoryReps = [15, 12, 10][waveIndex]
      const accessorySets = [3, 4, 5][weekInWave]
      return {
        label: `Week ${weekInWave + 1}`,
        phaseKey,
        phaseLabel,
        waveLabel: `Wave ${waveIndex + 1}`,
        summary: `${mainSets}x${mainReps} main work starts at ${Math.round(low * 100)}%${high ? `-${Math.round(high * 100)}%` : ''}; variation and bodybuilding volume step up across the wave.`,
        hardness: weekInWave === 2 ? 'Hard' : weekInWave === 1 ? 'Medium' : 'Light',
        prescriptions: {
          main: {
            targetSummary: `${mainSets}x${mainReps} @ ${Math.round(low * 100)}${high ? `-${Math.round(high * 100)}` : ''}%`,
            progressionRuleId: 'wave_step_load',
            sets: repeatedSets(mainSets, {
              targetLoad: percent(low, high),
              targetReps: mainReps,
              targetRir: 3,
              label: `${mainReps}`,
            }),
          },
          variation: {
            targetSummary: `${variationSets}x${variationReps} @ RPE 6-7`,
            progressionRuleId: 'variation_step_sets',
            sets: repeatedSets(variationSets, {
              targetLoad: userSelected(),
              targetReps: variationReps,
              targetRpe: 6.5,
              label: `${variationReps}`,
            }),
          },
          bodybuilding: accessoryPrescription(accessorySets, accessoryReps, accessoryReps),
        },
      }
    }

    const mainReps = [3, 2, 1][waveIndex]
    const mainPercent = [
      [0.8, 0.85, null],
      [0.85, 0.9, null],
      [0.9, 0.95, null],
    ][waveIndex]?.[weekInWave]
    const mainSets = [5, 3, 1][weekInWave]
    const variationReps = [5, 4, 3][waveIndex]
    const variationSets = [5, 4, 3][weekInWave]
    const variationPercent = [
      [0.7, 0.75, 0.8],
      [0.75, 0.8, 0.85],
      [0.8, 0.85, 0.9],
    ][waveIndex]?.[weekInWave] ?? 0.75
    const bodybuildingReps = [9, 7, 5][waveIndex]
    const bodybuildingSets = [5, 4, 2][weekInWave]
    return {
      label: `Week ${weekInWave + 1}`,
      phaseKey,
      phaseLabel,
      waveLabel: `Wave ${waveIndex + 1}`,
      summary: mainPercent
        ? `${mainSets}x${mainReps}${weekInWave === 1 ? '+' : ''} main work around ${Math.round(mainPercent * 100)}%; variation work gets heavier as bodybuilding volume tapers.`
        : `Work to a clean max ${mainReps}; variation work stays specific while bodybuilding volume tapers.`,
      hardness: weekInWave === 2 ? 'Hard' : weekInWave === 1 ? 'Medium' : 'Light',
      prescriptions: {
        main: {
          targetSummary: mainPercent
            ? `${mainSets}x${mainReps}${weekInWave === 1 ? '+' : ''} @ ${Math.round(mainPercent * 100)}%`
            : `Max ${mainReps}`,
          progressionRuleId: 'peak_top_set',
          sets: repeatedSets(
            mainSets,
            {
              targetLoad: mainPercent ? percent(mainPercent) : userSelected(),
              targetReps: mainReps,
              targetRir: weekInWave === 2 ? 0 : 2,
              label: weekInWave === 2 ? `Max ${mainReps}` : `${mainReps}`,
            },
            weekInWave > 0,
          ),
        },
        variation: {
          targetSummary: `${variationSets}x${variationReps} @ ${Math.round(variationPercent * 100)}%`,
          progressionRuleId: 'peak_variation',
          sets: repeatedSets(variationSets, {
            targetLoad: percent(variationPercent),
            targetReps: variationReps,
            targetRir: 2,
            label: `${variationReps}`,
          }),
        },
        bodybuilding: accessoryPrescription(bodybuildingSets, bodybuildingReps, bodybuildingReps),
      },
    }
  })
}

function volumeIntensityWeeks(): TemplateDefinition['weeks'] {
  return [
    { phaseKey: 'base', phaseLabel: 'Base phase', waveLabel: 'Volume wave', label: 'Week 1', volumeSets: 3, volumeReps: 12, volumePercent: 0.55, intensityPercent: 0.65, intensityLabel: '65% x F', hardness: 'Light' as const },
    { phaseKey: 'base', phaseLabel: 'Base phase', waveLabel: 'Volume wave', label: 'Week 2', volumeSets: 4, volumeReps: 10, volumePercent: 0.6, intensityPercent: 0.7, intensityLabel: '70% x F', hardness: 'Medium' as const },
    { phaseKey: 'base', phaseLabel: 'Base phase', waveLabel: 'Volume wave', label: 'Week 3', volumeSets: 5, volumeReps: 8, volumePercent: 0.65, intensityPercent: 0.75, intensityLabel: '75% x F', hardness: 'Hard' as const },
    { phaseKey: 'peak', phaseLabel: 'Peak phase', waveLabel: 'Top-set wave', label: 'Week 1', volumeSets: 5, volumeReps: 5, volumePercent: 0.75, topReps: 5, hardness: 'Medium' as const },
    { phaseKey: 'peak', phaseLabel: 'Peak phase', waveLabel: 'Top-set wave', label: 'Week 2', volumeSets: 5, volumeReps: 4, volumePercent: 0.8, topReps: 3, hardness: 'Hard' as const },
    { phaseKey: 'peak', phaseLabel: 'Peak phase', waveLabel: 'Top-set wave', label: 'Week 3', volumeSets: 5, volumeReps: 3, volumePercent: 0.85, topReps: 1, hardness: 'Hard' as const },
  ].map((week) => {
    const isPeak = week.phaseKey === 'peak'
    return {
      label: week.label,
      phaseKey: week.phaseKey,
      phaseLabel: week.phaseLabel,
      waveLabel: week.waveLabel,
      summary: isPeak
        ? `${week.volumeSets}x${week.volumeReps} volume work at ${Math.round(week.volumePercent * 100)}% plus top ${week.topReps} intensity work at RPE 7.`
        : `${week.volumeSets}x${week.volumeReps} volume work at ${Math.round(week.volumePercent * 100)}% with intensity exposures at ${Math.round((week.intensityPercent ?? 0) * 100)}% x F.`,
      hardness: week.hardness,
      prescriptions: {
        volume: {
          targetSummary: `${week.volumeSets}x${week.volumeReps} @ ${Math.round(week.volumePercent * 100)}%`,
          progressionRuleId: 'volume_track',
          sets: repeatedSets(week.volumeSets, {
            targetLoad: percent(week.volumePercent),
            targetReps: week.volumeReps,
            targetRir: 3,
            label: `${week.volumeReps}`,
          }),
        },
        intensity: {
          targetSummary: isPeak ? `Top ${week.topReps} @ RPE 7` : week.intensityLabel ?? 'Intensity top set',
          progressionRuleId: 'intensity_track',
          sets: [
            {
              targetLoad: isPeak ? userSelected() : percent(week.intensityPercent ?? 0.65),
              targetReps: isPeak ? week.topReps : undefined,
              targetRepMin: isPeak ? undefined : 1,
              targetRepMax: isPeak ? undefined : 20,
              targetRir: isPeak ? undefined : 1,
              targetRpe: isPeak ? 7 : undefined,
              isTopSet: true,
              isAmrap: !isPeak,
              label: isPeak ? `Top ${week.topReps}` : 'F',
            },
          ],
        },
        row: accessoryPrescription(3, 8, 12),
        chinup: accessoryPrescription(3, 6, 10),
      },
    }
  })
}

export const fallbackTemplateDefinitions: Record<string, TemplateDefinition> = {
  'generic_alternating_5x5_lp': {
    schemaVersion: '2026.06.dsl',
    id: 'generic_alternating_5x5_lp',
    name: 'Beginner 5x5 Linear',
    durationWeeks: 2,
    daysPerWeek: 3,
    requiredState: requiredWorkingLoadState(alternating5x5MovementIds),
    timelineDescription: 'Two-week A/B rotation for three non-consecutive training days per week.',
    sessions: alternating5x5Sessions(),
    weeks: alternating5x5Weeks(),
    progressionRules: {
      main: 'simple_linear_completion',
      accessory: 'accessory_double_progression',
    },
    progressionConfig: {
      simple_linear_completion: {
        increments: {
          squat: { kg: 2.5, lb: 5 },
          bench_press: { kg: 2.5, lb: 5 },
          overhead_press: { kg: 2.5, lb: 5 },
          deadlift: { kg: 5, lb: 10 },
          barbell_row: { kg: 2.5, lb: 5 },
        },
      },
    },
  },
  'beginner_upper_lower_lp': {
    schemaVersion: '2026.06.dsl',
    id: 'beginner_upper_lower_lp',
    name: 'Beginner Upper/Lower',
    durationWeeks: 1,
    daysPerWeek: 4,
    requiredState: requiredWorkingLoadState(beginnerUpperLowerMovementIds),
    timelineDescription: 'Four-day upper/lower split with straight-set linear progression on the main lifts.',
    sessions: beginnerUpperLowerSessions(),
    weeks: beginnerUpperLowerWeeks(),
    progressionRules: {
      main: 'simple_linear_completion',
      accessory: 'accessory_double_progression',
    },
    progressionConfig: {
      simple_linear_completion: { increments: linearIncrements },
    },
  },
  'ramping_5x5_3day': {
    schemaVersion: '2026.06.dsl',
    id: 'ramping_5x5_3day',
    name: 'Ramping 5x5',
    durationWeeks: 1,
    daysPerWeek: 3,
    requiredState: requiredWorkingLoadState(ramping5x5MovementIds),
    timelineDescription: 'Three-day weekly ramp — heavy, recovery, and volume days with weekly load increases.',
    sessions: ramping5x5Sessions(),
    weeks: ramping5x5Weeks(),
    progressionRules: {
      main: 'simple_linear_completion',
      accessory: 'accessory_double_progression',
    },
    progressionConfig: {
      simple_linear_completion: { increments: linearIncrements },
    },
  },
  'power_hypertrophy_ul': {
    schemaVersion: '2026.06.dsl',
    id: 'power_hypertrophy_ul',
    name: 'Power + Hypertrophy U/L',
    durationWeeks: 1,
    daysPerWeek: 4,
    requiredState: requiredWorkingLoadState(powerHypertrophyMovementIds),
    timelineDescription: 'Four-day powerbuilding split — two heavy power days and two higher-rep hypertrophy days.',
    sessions: powerHypertrophySessions(),
    weeks: powerHypertrophyWeeks(),
    progressionRules: {
      main: 'simple_linear_completion',
      accessory: 'accessory_double_progression',
    },
    progressionConfig: {
      simple_linear_completion: { increments: linearIncrements },
    },
  },
  'weekly_intensity_3day': {
    schemaVersion: '2026.06.dsl',
    id: 'weekly_intensity_3day',
    name: '3-Day Strength (Volume to Intensity)',
    durationWeeks: 1,
    daysPerWeek: 3,
    requiredState: requiredWorkingLoadState(weeklyIntensityMovementIds),
    timelineDescription: 'Three-day weekly progression — a volume day, a recovery day, and an intensity day chasing a new top set.',
    sessions: weeklyIntensitySessions(),
    weeks: weeklyIntensityWeeks(),
    progressionRules: {
      main: 'simple_linear_completion',
      accessory: 'accessory_double_progression',
    },
    progressionConfig: {
      simple_linear_completion: { increments: linearIncrements },
    },
  },
  'healthy-531-fsl': {
    schemaVersion: '2026.06.dsl',
    id: 'healthy-531-fsl',
    name: 'Training Max Wave',
    durationWeeks: 4,
    daysPerWeek: 4,
    requiredState: requiredTrainingMaxState(),
    timelineDescription: '4-week training-max percentage wave with four main-lift sessions per week.',
    sessions: [
      healthySession('squat-day', 'Squat + Lower Accessories', 'squat', [
        ['accessory-1', 'accessory', 'leg_press'],
        ['accessory-2', 'accessory', 'hamstring_curl'],
        ['accessory-3', 'accessory', 'cable_crunch'],
      ]),
      healthySession('bench-day', 'Bench + Upper Back', 'bench_press', [
        ['accessory-1', 'accessory', 'chest_supported_row'],
        ['accessory-2', 'accessory', 'incline_dumbbell_press'],
        ['accessory-3', 'accessory', 'triceps_pressdown'],
      ]),
      healthySession('deadlift-day', 'Deadlift + Posterior Chain', 'deadlift', [
        ['accessory-1', 'variation', 'romanian_deadlift', 'deadlift'],
        ['accessory-2', 'accessory', 'back_extension'],
        ['accessory-3', 'accessory', 'cable_crunch'],
      ]),
      healthySession('press-day', 'Overhead Press + Upper Back', 'overhead_press', [
        ['accessory-1', 'accessory', 'lat_pulldown'],
        ['accessory-2', 'accessory', 'face_pull'],
        ['accessory-3', 'accessory', 'dumbbell_row'],
      ]),
    ],
    weeks: trainingMaxWaveWeeks(),
    progressionRules: {
      main: 'training_max_band',
      accessory: 'accessory_double_progression',
    },
  },
  'bromley-bullmastiff': {
    schemaVersion: '2026.06.dsl',
    id: 'bromley-bullmastiff',
    name: 'Old School Wave Powerbuilding',
    durationWeeks: 18,
    daysPerWeek: 4,
    requiredState: requiredTrainingMaxState(),
    timelineDescription: '18-week wave structure: 9 base weeks, then 9 peak weeks. Each phase uses three 3-week waves.',
    sessions: [
      waveSession('wave-squat', 'Squat Wave', 'squat', 'front_squat', 'pause_squat', ['leg_press', 'hamstring_curl']),
      waveSession('wave-bench', 'Bench Wave', 'bench_press', 'close_grip_bench_press', 'board_press', ['chest_supported_row', 'triceps_pressdown']),
      waveSession('wave-deadlift', 'Deadlift Wave', 'deadlift', 'stiff_leg_deadlift', 'low_trap_bar_deadlift', ['back_extension', 'cable_crunch']),
      waveSession('wave-press', 'Press Wave', 'overhead_press', 'behind_neck_press', 'seated_pin_press', ['lat_pulldown', 'face_pull']),
    ],
    weeks: plusSetWaveWeeks(),
    progressionRules: {
      main: 'plus_set_wave',
      variation: 'wave_step_load',
      accessory: 'accessory_double_progression',
    },
  },
  'bromley-70s-powerlifter': {
    schemaVersion: '2026.06.dsl',
    id: 'bromley-70s-powerlifter',
    name: 'Classic Volume Strength',
    durationWeeks: 18,
    daysPerWeek: 4,
    requiredState: requiredTrainingMaxState(),
    timelineDescription: '18-week upper/lower plan with three volumizing waves followed by three intensifying waves.',
    sessions: [
      seventiesSession('volume-bench', 'Bench Volume', 'bench_press', 'wide_grip_bench_press', 'pause_bench_press', 'incline_bench_press', 'floor_press', ['t_bar_row', 'barbell_curl', 'jm_press']),
      seventiesSession('volume-squat', 'Squat Volume', 'squat', 'wide_stance_squat', 'pause_squat', 'front_squat', 'high_box_squat', ['lunge', 'leg_press', 'sit_up']),
      seventiesSession('volume-press', 'Press Volume', 'overhead_press', 'wide_grip_overhead_press', 'push_press', 'behind_neck_press', 'standing_pin_press', ['upright_row', 'rope_pressdown', 'side_bend']),
      seventiesSession('volume-deadlift', 'Deadlift Volume', 'deadlift', 'romanian_deadlift', 'block_deadlift', 'good_morning', 'sumo_deadlift', ['pendlay_row', 'hamstring_curl', 'ab_wheel_rollout']),
    ],
    weeks: seventiesWeeks(),
    progressionRules: {
      main: 'wave_step_load',
      variation: 'variation_step_sets',
      accessory: 'accessory_double_progression',
    },
  },
  'bromley-volume-intensity': {
    schemaVersion: '2026.06.dsl',
    id: 'bromley-volume-intensity',
    name: 'Volume-Intensity Strength',
    durationWeeks: 6,
    daysPerWeek: 3,
    requiredState: requiredTrainingMaxState(),
    timelineDescription: '3-day whole-body program alternating a 3-week volumizing wave with a 3-week top-set wave.',
    sessions: [
      volumeIntensitySession('vi-monday', 'Volume-Intensity Monday', [
        ['squat-volume', 'main', 'squat', 'volume'],
        ['deadlift-intensity', 'main', 'deadlift', 'intensity'],
        ['bench-intensity', 'main', 'bench_press', 'intensity'],
        ['row', 'accessory', 'barbell_row', 'row'],
      ]),
      volumeIntensitySession('vi-wednesday', 'Volume-Intensity Wednesday', [
        ['squat-intensity', 'main', 'squat', 'intensity'],
        ['press-volume', 'main', 'overhead_press', 'volume'],
        ['chinup', 'accessory', 'chin_up', 'chinup'],
      ]),
      volumeIntensitySession('vi-friday', 'Volume-Intensity Friday', [
        ['bench-volume', 'main', 'bench_press', 'volume'],
        ['row', 'accessory', 'barbell_row', 'row'],
        ['chinup', 'accessory', 'chin_up', 'chinup'],
      ]),
    ],
    weeks: volumeIntensityWeeks(),
    progressionRules: {
      volume: 'volume_track',
      intensity: 'intensity_track',
      accessory: 'accessory_double_progression',
    },
  },
}

export function getFallbackTemplateDefinition(templateId: string) {
  const definition = fallbackTemplateDefinitions[templateId]
  if (!definition) throw new Error(`No fallback template definition for ${templateId}`)
  return definition
}

export function listFallbackTemplateDefinitions() {
  return Object.values(fallbackTemplateDefinitions)
}

function healthySession(
  id: string,
  title: string,
  mainMovementId: string,
  accessories: Array<[string, 'variation' | 'accessory', string, string?]>,
): TemplateDefinition['sessions'][number] {
  return {
    id,
    title,
    estimatedMinutes: 75,
    slots: [
      {
        id: 'main',
        role: 'main',
        movementId: mainMovementId,
        anchorMovementId: mainMovementId,
        prescriptionId: 'main',
      },
      ...accessories.map(([prescriptionId, role, movementId, anchorMovementId], index) => ({
        id: `accessory-${index + 1}`,
        role,
        movementId,
        anchorMovementId,
        prescriptionId,
      })),
    ],
  }
}

function waveSession(
  id: string,
  title: string,
  mainMovementId: string,
  baseVariationMovementId: string,
  peakVariationMovementId: string,
  accessories: string[],
): TemplateDefinition['sessions'][number] {
  return {
    id,
    title,
    estimatedMinutes: 80,
    slots: [
      {
        id: 'main',
        role: 'main',
        movementId: mainMovementId,
        anchorMovementId: mainMovementId,
        prescriptionId: 'main',
      },
      {
        id: 'variation',
        role: 'variation',
        movementId: { default: baseVariationMovementId, byPhase: { peak: peakVariationMovementId } },
        anchorMovementId: mainMovementId,
        prescriptionId: 'variation',
      },
      ...accessories.map((movementId, index) => ({
        id: `accessory-${index + 1}`,
        role: 'accessory' as const,
        movementId,
        prescriptionId: `accessory-${index + 1}`,
      })),
    ],
  }
}

function seventiesSession(
  id: string,
  title: string,
  mainMovementId: string,
  baseVariationOne: string,
  peakVariationOne: string,
  baseVariationTwo: string,
  peakVariationTwo: string,
  accessories: string[],
): TemplateDefinition['sessions'][number] {
  return {
    id,
    title,
    estimatedMinutes: 90,
    slots: [
      {
        id: 'main',
        role: 'main',
        movementId: mainMovementId,
        anchorMovementId: mainMovementId,
        prescriptionId: 'main',
      },
      {
        id: 'variation-1',
        role: 'variation',
        movementId: { default: baseVariationOne, byPhase: { peak: peakVariationOne } },
        anchorMovementId: mainMovementId,
        prescriptionId: 'variation',
      },
      {
        id: 'variation-2',
        role: 'variation',
        movementId: { default: baseVariationTwo, byPhase: { peak: peakVariationTwo } },
        anchorMovementId: mainMovementId,
        prescriptionId: 'variation',
      },
      ...accessories.map((movementId, index) => ({
        id: `accessory-${index + 1}`,
        role: 'accessory' as const,
        movementId,
        prescriptionId: 'bodybuilding',
      })),
    ],
  }
}

function volumeIntensitySession(
  id: string,
  title: string,
  slots: Array<[string, 'main' | 'accessory', string, string]>,
): TemplateDefinition['sessions'][number] {
  return {
    id,
    title,
    estimatedMinutes: 80,
    slots: slots.map(([slotId, role, movementId, prescriptionId]) => ({
      id: slotId,
      role,
      movementId,
      anchorMovementId: role === 'main' ? movementId : undefined,
      prescriptionId,
    })),
  }
}

function roundPercent(value: number) {
  return Math.round(value * 100) / 100
}
