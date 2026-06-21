import type {
  AnchorInput,
  MovementSlot,
  PlannedSession,
  ProgramInstance,
  ProgramTemplateSummary,
  Unit,
} from '~/types/training'
import { getMovementName } from './movements'
import { compute531FslSets, mround } from './progression'

export const templateCatalog: ProgramTemplateSummary[] = [
  {
    id: 'healthy-531-fsl',
    name: 'Healthy 5/3/1 FSL',
    source: 'healthy_531',
    sourceLabel: 'Healthy 5/3/1',
    description:
      'Standard 5/3/1 progression with First Set Last supplemental work and structured accessories.',
    daysPerWeek: 4,
    progressionLabel: 'TM progression + FSL',
    complexity: 'Intermediate',
    tags: ['5/3/1', 'base'],
    available: true,
  },
  {
    id: 'bromley-bullmastiff',
    name: 'Bromley Bullmastiff',
    source: 'bromley_base_strength',
    sourceLabel: 'Bromley',
    description:
      'Main lifts, variations, and bodybuilding work with autoregulated plus-set jumps.',
    daysPerWeek: 4,
    progressionLabel: 'Plus-set wave',
    complexity: 'Advanced',
    tags: ['bromley', 'base', 'high volume'],
    available: true,
  },
  {
    id: 'bromley-70s-powerlifter',
    name: 'Bromley 70s Powerlifter',
    source: 'bromley_base_strength',
    sourceLabel: 'Bromley',
    description: 'Upper/lower split with main lift, variation, and bodybuilding layers.',
    daysPerWeek: 4,
    progressionLabel: 'Base-to-peak waves',
    complexity: 'Advanced',
    tags: ['bromley', 'base', 'peak'],
    available: false,
  },
  {
    id: 'bromley-volume-intensity',
    name: 'Bromley Volume/Intensity',
    source: 'bromley_base_strength',
    sourceLabel: 'Bromley',
    description: 'Three-day whole-body split alternating volume and intensity waves.',
    daysPerWeek: 3,
    progressionLabel: 'Alternating waves',
    complexity: 'Intermediate',
    tags: ['bromley', 'base'],
    available: false,
  },
]

const healthyDays = [
  {
    id: 'squat-day',
    title: 'Squat + Lower Accessories',
    mainMovementId: 'squat',
    accessories: ['leg_press', 'hamstring_curl', 'cable_crunch'],
  },
  {
    id: 'bench-day',
    title: 'Bench + Upper Back',
    mainMovementId: 'bench_press',
    accessories: ['chest_supported_row', 'incline_dumbbell_press', 'triceps_pressdown'],
  },
  {
    id: 'deadlift-day',
    title: 'Deadlift + Posterior Chain',
    mainMovementId: 'deadlift',
    accessories: ['romanian_deadlift', 'back_extension', 'cable_crunch'],
  },
  {
    id: 'press-day',
    title: 'Overhead Press + Upper Back',
    mainMovementId: 'overhead_press',
    accessories: ['lat_pulldown', 'face_pull', 'dumbbell_row'],
  },
]

const bullmastiffDays = [
  {
    id: 'bull-squat',
    title: 'Bullmastiff Squat',
    mainMovementId: 'squat',
    variationMovementId: 'romanian_deadlift',
    accessories: ['leg_press', 'hamstring_curl'],
  },
  {
    id: 'bull-bench',
    title: 'Bullmastiff Bench',
    mainMovementId: 'bench_press',
    variationMovementId: 'incline_dumbbell_press',
    accessories: ['chest_supported_row', 'triceps_pressdown'],
  },
  {
    id: 'bull-deadlift',
    title: 'Bullmastiff Deadlift',
    mainMovementId: 'deadlift',
    variationMovementId: 'romanian_deadlift',
    accessories: ['back_extension', 'cable_crunch'],
  },
  {
    id: 'bull-press',
    title: 'Bullmastiff Overhead Press',
    mainMovementId: 'overhead_press',
    variationMovementId: 'bench_press',
    accessories: ['lat_pulldown', 'face_pull'],
  },
]

function anchorFor(anchors: AnchorInput[], movementId: string, fallback: number) {
  return anchors.find((anchor) => anchor.movementId === movementId)?.value ?? fallback
}

export function defaultAnchors(unit: Unit = 'kg'): AnchorInput[] {
  const values =
    unit === 'kg'
      ? { squat: 165, bench_press: 110, deadlift: 190, overhead_press: 75 }
      : { squat: 365, bench_press: 245, deadlift: 420, overhead_press: 165 }
  return Object.entries(values).map(([movementId, value]) => ({
    movementId,
    anchorType: 'training_max',
    value,
  }))
}

export function expandPlannedSession(program: ProgramInstance, scheduledDate: string) {
  if (program.templateId === 'bromley-bullmastiff') {
    return expandBullmastiffSession(program, scheduledDate)
  }
  return expandHealthy531Session(program, scheduledDate)
}

export function programForNextUncompletedSession(
  program: ProgramInstance,
  completedPlannedSessionIds: Iterable<string>,
  scheduledDate: string,
) {
  const completedIds = new Set(completedPlannedSessionIds)
  if (!completedIds.size) return program

  let nextProgram = program
  for (let attempts = 0; attempts < 64; attempts += 1) {
    const plannedSession = expandPlannedSession(nextProgram, scheduledDate)
    if (!completedIds.has(plannedSession.id)) return nextProgram
    nextProgram = { ...nextProgram, currentWeekIndex: nextProgram.currentWeekIndex + 1 }
  }

  return nextProgram
}

function expandHealthy531Session(program: ProgramInstance, scheduledDate: string): PlannedSession {
  const day = healthyDays[program.currentWeekIndex % healthyDays.length]
  const weekIndex = program.currentWeekIndex % 4
  const anchor = anchorFor(program.anchors, day.mainMovementId, 100)
  const mainSets = compute531FslSets(anchor, weekIndex, program.rounding).map((set) => ({
    ...set,
    completed: false,
    actualLoad: set.targetLoad,
    actualReps: set.targetReps,
  }))

  const movements: MovementSlot[] = [
    {
      id: `slot-${day.mainMovementId}`,
      movementId: day.mainMovementId,
      movementName: getMovementName(day.mainMovementId),
      role: 'main',
      orderIndex: 1,
      targetSummary: mainSets
        .slice(0, 3)
        .map((set) => `${set.targetLoad}x${set.label}`)
        .join(' · '),
      sets: mainSets,
      previous: {
        movementId: day.mainMovementId,
        label: 'Last comparable: no prior log yet',
      },
    },
    ...day.accessories.map((movementId, index): MovementSlot => {
      const load = accessoryDefaultLoad(program.units, index)
      return {
        id: `slot-${movementId}`,
        movementId,
        movementName: getMovementName(movementId),
        role: index === 0 && movementId === 'romanian_deadlift' ? 'variation' : 'accessory',
        orderIndex: index + 2,
        targetSummary: '4 sets x 8-12 reps @ RIR 2',
        sets: Array.from({ length: 4 }, (_, setIndex) => ({
          id: `${movementId}-${setIndex + 1}`,
          setIndex: setIndex + 1,
          targetLoad: load,
          targetRepMin: 8,
          targetRepMax: 12,
          targetRir: 2,
          actualLoad: load,
          completed: false,
          label: '8-12',
        })),
        previous: {
          movementId,
          label: 'Last time: no prior log yet',
        },
      }
    }),
  ]

  return {
    id: `${day.id}-w${weekIndex + 1}`,
    title: day.title,
    programTitle: program.title,
    templateId: program.templateId,
    weekIndex: program.currentWeekIndex,
    weekLabel: `Week ${weekIndex + 1}`,
    hardness: weekIndex === 3 ? 'Deload' : weekIndex === 2 ? 'Hard' : 'Medium',
    scheduledDate,
    estimatedMinutes: 75,
    units: program.units,
    rounding: program.rounding,
    movements,
  }
}

function expandBullmastiffSession(program: ProgramInstance, scheduledDate: string): PlannedSession {
  const day = bullmastiffDays[program.currentWeekIndex % bullmastiffDays.length]
  const waveWeek = program.currentWeekIndex % 3
  const anchor = anchorFor(program.anchors, day.mainMovementId, 100)
  const baselineReps = [6, 4, 2][waveWeek]
  const percent = [0.65, 0.72, 0.78][waveWeek]
  const mainLoad = mround(anchor * percent, program.rounding)
  const mainSets = Array.from({ length: 4 }, (_, index) => ({
    id: `bull-main-${index + 1}`,
    setIndex: index + 1,
    targetLoad: mainLoad,
    targetReps: baselineReps,
    targetRir: index === 3 ? 0 : 2,
    isTopSet: index === 3,
    isAmrap: index === 3,
    completed: false,
    actualLoad: mainLoad,
    actualReps: baselineReps,
    label: index === 3 ? `${baselineReps}+` : `${baselineReps}`,
  }))

  const variationLoad = mround(anchor * 0.55, program.rounding)
  const variation: MovementSlot = {
    id: `slot-${day.variationMovementId}`,
    movementId: day.variationMovementId,
    movementName: getMovementName(day.variationMovementId),
    role: 'variation',
    orderIndex: 2,
    targetSummary: 'Step-loaded variation work',
    sets: Array.from({ length: waveWeek + 3 }, (_, index) => ({
      id: `${day.variationMovementId}-${index + 1}`,
      setIndex: index + 1,
      targetLoad: variationLoad,
      targetReps: 8,
      targetRir: 3,
      completed: false,
      actualLoad: variationLoad,
      actualReps: 8,
      label: '8',
    })),
    previous: { movementId: day.variationMovementId, label: 'Last time: no prior log yet' },
  }

  return {
    id: `${day.id}-w${waveWeek + 1}`,
    title: day.title,
    programTitle: program.title,
    templateId: program.templateId,
    weekIndex: program.currentWeekIndex,
    weekLabel: `Wave Week ${waveWeek + 1}`,
    hardness: waveWeek === 2 ? 'Hard' : waveWeek === 1 ? 'Medium' : 'Light',
    scheduledDate,
    estimatedMinutes: 80,
    units: program.units,
    rounding: program.rounding,
    movements: [
      {
        id: `slot-${day.mainMovementId}`,
        movementId: day.mainMovementId,
        movementName: getMovementName(day.mainMovementId),
        role: 'main',
        orderIndex: 1,
        targetSummary: `${mainSets.length} sets x ${baselineReps}+ @ ${mainLoad}`,
        sets: mainSets,
        previous: { movementId: day.mainMovementId, label: 'Last comparable: no prior log yet' },
      },
      variation,
      ...day.accessories.map((movementId, index): MovementSlot => ({
        id: `slot-${movementId}`,
        movementId,
        movementName: getMovementName(movementId),
        role: 'accessory',
        orderIndex: index + 3,
        targetSummary: '3 sets x 10-15 reps @ RIR 2',
        sets: Array.from({ length: 3 }, (_, setIndex) => ({
          id: `${movementId}-${setIndex + 1}`,
          setIndex: setIndex + 1,
          targetLoad: accessoryDefaultLoad(program.units, index),
          targetRepMin: 10,
          targetRepMax: 15,
          targetRir: 2,
          completed: false,
          actualLoad: accessoryDefaultLoad(program.units, index),
          label: '10-15',
        })),
        previous: { movementId, label: 'Last time: no prior log yet' },
      })),
    ],
  }
}

function accessoryDefaultLoad(unit: Unit, index: number) {
  const kg = [55, 40, 25, 20][index] ?? 30
  return unit === 'kg' ? kg : mround(kg * 2.205, 5)
}
