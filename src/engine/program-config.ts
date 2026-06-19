// Canonical 5/3/1 FSL program definition plus editable accessory defaults.
// Keep this declarative; calculations live in pure engine helpers.

import type { LiftId, SessionType, WeekName } from './types'

export const ROUNDING_KG = 2.5

export const DEFAULT_TM_PCT: Record<LiftId, number> = {
  squat: 0.85,
  bench: 0.8,
  deadlift: 0.85,
}

export const FSL_SETS: Record<LiftId, number> = {
  squat: 5,
  bench: 5,
  deadlift: 4,
}

export interface MainSetSpec {
  pct: number
  reps: number
  top?: boolean
  min?: number
  amrap?: boolean
}

export interface FslSpec {
  pct: number
  reps: number
}

export interface WeekSpec {
  name: WeekName
  label: string
  sets: MainSetSpec[]
  fsl: FslSpec | null
}

export const CYCLE_WEEKS: readonly WeekSpec[] = [
  {
    name: '5s',
    label: 'Week 1 - 5s',
    sets: [
      { pct: 0.65, reps: 5 },
      { pct: 0.75, reps: 5 },
      { pct: 0.85, reps: 5, top: true, min: 5, amrap: true },
    ],
    fsl: { pct: 0.65, reps: 5 },
  },
  {
    name: '3s',
    label: 'Week 2 - 3s',
    sets: [
      { pct: 0.7, reps: 3 },
      { pct: 0.8, reps: 3 },
      { pct: 0.9, reps: 3, top: true, min: 3, amrap: true },
    ],
    fsl: { pct: 0.65, reps: 5 },
  },
  {
    name: '531',
    label: 'Week 3 - 5/3/1',
    sets: [
      { pct: 0.75, reps: 5 },
      { pct: 0.85, reps: 3 },
      { pct: 0.95, reps: 1, top: true, min: 1, amrap: true },
    ],
    fsl: { pct: 0.65, reps: 5 },
  },
  {
    name: 'deload',
    label: 'Week 4 - deload',
    sets: [
      { pct: 0.4, reps: 5 },
      { pct: 0.5, reps: 5 },
      { pct: 0.6, reps: 5 },
    ],
    fsl: null,
  },
]

export const TOP_SET_NOTE: Record<LiftId, string> = {
  squat: 'Top set - stop at RPE 8 (2+ reps in reserve). No grinding, no failure.',
  deadlift: 'Top set - stop at RPE 8 (2+ reps in reserve). No grinding, no failure.',
  bench: 'No AMRAP - hit the minimum reps then stop 2-3 reps short. The shoulder gates this set.',
}

export const WEEKLY_SCHEDULE: Record<number, SessionType> = {
  0: 'rest',
  1: 'squat',
  2: 'sport',
  3: 'bench',
  4: 'assist',
  5: 'deadlift',
  6: 'sport',
}

export const SESSION_LABELS: Record<SessionType, string> = {
  squat: 'Squat (hard) + bench submax',
  bench: 'Bench (hard, capped) + back',
  deadlift: 'Deadlift (hard) + posterior chain',
  assist: 'Assistance + technique',
  sport: 'Martial arts / sport',
  z2: 'Zone-2 + light technique squat',
  rest: 'Rest + mobility',
}

export interface AccessorySpec {
  id: string
  name: string
  sets: number
  repLow: number
  repHigh: number
  note?: string
  painGated?: boolean
}

export type ExerciseCategory =
  | 'quad'
  | 'hamstring'
  | 'hinge'
  | 'row'
  | 'vertical-pull'
  | 'press'
  | 'triceps'
  | 'biceps'
  | 'core'
  | 'prehab'

export type FatigueCost = 'low' | 'moderate' | 'high'

export interface ExerciseSpec {
  id: string
  name: string
  category: ExerciseCategory
  targetMuscles: string[]
  equipment: string
  fatigueCost: FatigueCost
  painGated?: boolean
  note?: string
  custom?: boolean
}

export type LiftSessionType = Extract<SessionType, 'squat' | 'bench' | 'deadlift' | 'assist'>

export interface AccessorySlotSpec {
  id: string
  sessionType: LiftSessionType
  title: string
  plannedExerciseId: string
  swapPool: string[]
  category: ExerciseCategory
  sets: number
  repLow: number
  repHigh: number
  restSeconds: number
  painGated?: boolean
  fatigueSensitive?: boolean
  note?: string
}

export interface SessionTemplateSpec {
  sessionType: LiftSessionType
  accessorySlotIds: string[]
}

export const DEFAULT_EXERCISE_LIBRARY: Record<string, ExerciseSpec> = {
  'leg-press': {
    id: 'leg-press',
    name: 'Leg press',
    category: 'quad',
    targetMuscles: ['quads', 'glutes'],
    equipment: 'machine',
    fatigueCost: 'moderate',
  },
  'bulgarian-split-squat': {
    id: 'bulgarian-split-squat',
    name: 'Bulgarian split squat',
    category: 'quad',
    targetMuscles: ['quads', 'glutes', 'adductors'],
    equipment: 'dumbbells',
    fatigueCost: 'high',
  },
  'hack-squat': {
    id: 'hack-squat',
    name: 'Hack squat',
    category: 'quad',
    targetMuscles: ['quads', 'glutes'],
    equipment: 'machine',
    fatigueCost: 'moderate',
  },
  'paused-squat-technique': {
    id: 'paused-squat-technique',
    name: 'Paused squat technique',
    category: 'quad',
    targetMuscles: ['quads', 'glutes', 'positioning'],
    equipment: 'barbell',
    fatigueCost: 'low',
    note: 'Light, crisp triples. Treat this as practice, not a max-effort squat day.',
  },
  'leg-curl': {
    id: 'leg-curl',
    name: 'Lying / seated leg curl',
    category: 'hamstring',
    targetMuscles: ['hamstrings'],
    equipment: 'machine',
    fatigueCost: 'low',
  },
  'nordic-curl': {
    id: 'nordic-curl',
    name: 'Assisted Nordic curl',
    category: 'hamstring',
    targetMuscles: ['hamstrings'],
    equipment: 'bodyweight',
    fatigueCost: 'moderate',
  },
  'triceps-pushdown': {
    id: 'triceps-pushdown',
    name: 'Triceps pushdown',
    category: 'triceps',
    targetMuscles: ['triceps'],
    equipment: 'cable',
    fatigueCost: 'low',
  },
  'rope-overhead-extension': {
    id: 'rope-overhead-extension',
    name: 'Rope overhead extension',
    category: 'triceps',
    targetMuscles: ['triceps'],
    equipment: 'cable',
    fatigueCost: 'low',
    painGated: true,
    note: 'Use only if the shoulder is calm overhead.',
  },
  'hanging-leg-raise': {
    id: 'hanging-leg-raise',
    name: 'Hanging leg raise',
    category: 'core',
    targetMuscles: ['abs', 'hip flexors'],
    equipment: 'bodyweight',
    fatigueCost: 'low',
  },
  'ab-wheel': {
    id: 'ab-wheel',
    name: 'Ab wheel',
    category: 'core',
    targetMuscles: ['abs', 'lats'],
    equipment: 'wheel',
    fatigueCost: 'moderate',
  },
  'cs-row': {
    id: 'cs-row',
    name: 'Chest-supported row',
    category: 'row',
    targetMuscles: ['mid back', 'lats'],
    equipment: 'machine / dumbbells',
    fatigueCost: 'moderate',
  },
  'seal-row': {
    id: 'seal-row',
    name: 'Seal row',
    category: 'row',
    targetMuscles: ['mid back', 'lats'],
    equipment: 'barbell',
    fatigueCost: 'moderate',
  },
  'db-row': {
    id: 'db-row',
    name: 'DB row',
    category: 'row',
    targetMuscles: ['lats', 'mid back'],
    equipment: 'dumbbell',
    fatigueCost: 'moderate',
  },
  'lat-pulldown': {
    id: 'lat-pulldown',
    name: 'Neutral-grip lat pulldown',
    category: 'vertical-pull',
    targetMuscles: ['lats', 'biceps'],
    equipment: 'cable',
    fatigueCost: 'low',
  },
  'assisted-pullup': {
    id: 'assisted-pullup',
    name: 'Assisted pull-up',
    category: 'vertical-pull',
    targetMuscles: ['lats', 'biceps'],
    equipment: 'machine / band',
    fatigueCost: 'moderate',
  },
  'incline-db': {
    id: 'incline-db',
    name: 'Incline DB press, neutral grip',
    category: 'press',
    targetMuscles: ['pecs', 'front delts', 'triceps'],
    equipment: 'dumbbells',
    fatigueCost: 'moderate',
    painGated: true,
    note: 'Only if pain-free.',
  },
  'machine-press': {
    id: 'machine-press',
    name: 'Machine chest press',
    category: 'press',
    targetMuscles: ['pecs', 'triceps'],
    equipment: 'machine',
    fatigueCost: 'moderate',
    painGated: true,
  },
  'pushup-handles': {
    id: 'pushup-handles',
    name: 'Push-up on handles',
    category: 'press',
    targetMuscles: ['pecs', 'triceps'],
    equipment: 'bodyweight',
    fatigueCost: 'low',
    painGated: true,
  },
  'db-floor-press': {
    id: 'db-floor-press',
    name: 'DB floor press',
    category: 'press',
    targetMuscles: ['pecs', 'triceps'],
    equipment: 'dumbbells',
    fatigueCost: 'low',
    painGated: true,
    note: 'Shoulder-friendly pressing option. Stop if pain appears.',
  },
  'hammer-curl': {
    id: 'hammer-curl',
    name: 'DB hammer curl',
    category: 'biceps',
    targetMuscles: ['biceps', 'brachialis'],
    equipment: 'dumbbells',
    fatigueCost: 'low',
  },
  'cable-curl': {
    id: 'cable-curl',
    name: 'Cable curl',
    category: 'biceps',
    targetMuscles: ['biceps'],
    equipment: 'cable',
    fatigueCost: 'low',
  },
  'face-pull': {
    id: 'face-pull',
    name: 'Face pulls + band external rotation',
    category: 'prehab',
    targetMuscles: ['rear delts', 'rotator cuff'],
    equipment: 'cable / band',
    fatigueCost: 'low',
  },
  'band-pull-apart': {
    id: 'band-pull-apart',
    name: 'Band pull-apart',
    category: 'prehab',
    targetMuscles: ['rear delts', 'upper back'],
    equipment: 'band',
    fatigueCost: 'low',
  },
  rdl: {
    id: 'rdl',
    name: 'Romanian deadlift',
    category: 'hinge',
    targetMuscles: ['hamstrings', 'glutes', 'back'],
    equipment: 'barbell',
    fatigueCost: 'high',
  },
  'back-ext': {
    id: 'back-ext',
    name: '45 degree back extension',
    category: 'hinge',
    targetMuscles: ['hamstrings', 'glutes', 'back'],
    equipment: 'machine',
    fatigueCost: 'moderate',
  },
  'hip-thrust': {
    id: 'hip-thrust',
    name: 'Hip thrust',
    category: 'hinge',
    targetMuscles: ['glutes', 'hamstrings'],
    equipment: 'barbell / machine',
    fatigueCost: 'moderate',
  },
  'cable-crunch': {
    id: 'cable-crunch',
    name: 'Cable crunch',
    category: 'core',
    targetMuscles: ['abs'],
    equipment: 'cable',
    fatigueCost: 'low',
  },
  plank: {
    id: 'plank',
    name: 'Plank',
    category: 'core',
    targetMuscles: ['abs', 'trunk'],
    equipment: 'bodyweight',
    fatigueCost: 'low',
  },
}

export const ACCESSORY_SLOTS: Record<string, AccessorySlotSpec> = {
  'squat-quad': {
    id: 'squat-quad',
    sessionType: 'squat',
    title: 'Quad volume',
    plannedExerciseId: 'leg-press',
    swapPool: ['leg-press', 'bulgarian-split-squat', 'hack-squat'],
    category: 'quad',
    sets: 3,
    repLow: 10,
    repHigh: 12,
    restSeconds: 90,
    fatigueSensitive: true,
  },
  'squat-hamstring': {
    id: 'squat-hamstring',
    sessionType: 'squat',
    title: 'Hamstring support',
    plannedExerciseId: 'leg-curl',
    swapPool: ['leg-curl', 'nordic-curl'],
    category: 'hamstring',
    sets: 3,
    repLow: 12,
    repHigh: 15,
    restSeconds: 75,
  },
  'squat-triceps': {
    id: 'squat-triceps',
    sessionType: 'squat',
    title: 'Pressing support',
    plannedExerciseId: 'triceps-pushdown',
    swapPool: ['triceps-pushdown', 'rope-overhead-extension'],
    category: 'triceps',
    sets: 3,
    repLow: 12,
    repHigh: 15,
    restSeconds: 60,
  },
  'squat-core': {
    id: 'squat-core',
    sessionType: 'squat',
    title: 'Core',
    plannedExerciseId: 'hanging-leg-raise',
    swapPool: ['hanging-leg-raise', 'ab-wheel', 'plank'],
    category: 'core',
    sets: 3,
    repLow: 10,
    repHigh: 15,
    restSeconds: 60,
  },
  'bench-row': {
    id: 'bench-row',
    sessionType: 'bench',
    title: 'Heavy row',
    plannedExerciseId: 'cs-row',
    swapPool: ['cs-row', 'seal-row', 'db-row'],
    category: 'row',
    sets: 4,
    repLow: 8,
    repHigh: 12,
    restSeconds: 90,
  },
  'bench-pull': {
    id: 'bench-pull',
    sessionType: 'bench',
    title: 'Vertical pull',
    plannedExerciseId: 'lat-pulldown',
    swapPool: ['lat-pulldown', 'assisted-pullup'],
    category: 'vertical-pull',
    sets: 3,
    repLow: 10,
    repHigh: 12,
    restSeconds: 75,
  },
  'bench-press': {
    id: 'bench-press',
    sessionType: 'bench',
    title: 'Optional press',
    plannedExerciseId: 'incline-db',
    swapPool: ['incline-db', 'machine-press', 'pushup-handles'],
    category: 'press',
    sets: 3,
    repLow: 8,
    repHigh: 12,
    restSeconds: 90,
    painGated: true,
    note: 'Skip or swap away if the shoulder is not fully calm.',
  },
  'bench-curl': {
    id: 'bench-curl',
    sessionType: 'bench',
    title: 'Arm balance',
    plannedExerciseId: 'hammer-curl',
    swapPool: ['hammer-curl', 'cable-curl'],
    category: 'biceps',
    sets: 3,
    repLow: 12,
    repHigh: 12,
    restSeconds: 60,
  },
  'bench-prehab': {
    id: 'bench-prehab',
    sessionType: 'bench',
    title: 'Shoulder prehab',
    plannedExerciseId: 'face-pull',
    swapPool: ['face-pull', 'band-pull-apart'],
    category: 'prehab',
    sets: 4,
    repLow: 15,
    repHigh: 20,
    restSeconds: 45,
  },
  'deadlift-hinge': {
    id: 'deadlift-hinge',
    sessionType: 'deadlift',
    title: 'Posterior chain',
    plannedExerciseId: 'rdl',
    swapPool: ['rdl', 'back-ext', 'hip-thrust'],
    category: 'hinge',
    sets: 3,
    repLow: 8,
    repHigh: 10,
    restSeconds: 120,
    fatigueSensitive: true,
  },
  'deadlift-back-ext': {
    id: 'deadlift-back-ext',
    sessionType: 'deadlift',
    title: 'Back extension',
    plannedExerciseId: 'back-ext',
    swapPool: ['back-ext', 'hip-thrust'],
    category: 'hinge',
    sets: 3,
    repLow: 12,
    repHigh: 15,
    restSeconds: 90,
    fatigueSensitive: true,
  },
  'deadlift-row': {
    id: 'deadlift-row',
    sessionType: 'deadlift',
    title: 'Row',
    plannedExerciseId: 'db-row',
    swapPool: ['db-row', 'cs-row', 'seal-row'],
    category: 'row',
    sets: 3,
    repLow: 10,
    repHigh: 10,
    restSeconds: 75,
  },
  'deadlift-core': {
    id: 'deadlift-core',
    sessionType: 'deadlift',
    title: 'Core',
    plannedExerciseId: 'cable-crunch',
    swapPool: ['cable-crunch', 'plank', 'ab-wheel'],
    category: 'core',
    sets: 3,
    repLow: 10,
    repHigh: 15,
    restSeconds: 60,
  },
  'assist-technique-squat': {
    id: 'assist-technique-squat',
    sessionType: 'assist',
    title: 'Technique squat',
    plannedExerciseId: 'paused-squat-technique',
    swapPool: ['paused-squat-technique', 'leg-press', 'hack-squat'],
    category: 'quad',
    sets: 3,
    repLow: 3,
    repHigh: 3,
    restSeconds: 90,
    fatigueSensitive: true,
    note: 'Low-fatigue practice for position, bracing, and speed.',
  },
  'assist-upper-back': {
    id: 'assist-upper-back',
    sessionType: 'assist',
    title: 'Upper back volume',
    plannedExerciseId: 'cs-row',
    swapPool: ['cs-row', 'seal-row', 'db-row'],
    category: 'row',
    sets: 4,
    repLow: 10,
    repHigh: 12,
    restSeconds: 75,
  },
  'assist-vertical-pull': {
    id: 'assist-vertical-pull',
    sessionType: 'assist',
    title: 'Lat volume',
    plannedExerciseId: 'lat-pulldown',
    swapPool: ['lat-pulldown', 'assisted-pullup'],
    category: 'vertical-pull',
    sets: 3,
    repLow: 10,
    repHigh: 12,
    restSeconds: 75,
  },
  'assist-press-rehab': {
    id: 'assist-press-rehab',
    sessionType: 'assist',
    title: 'Shoulder-safe press',
    plannedExerciseId: 'db-floor-press',
    swapPool: ['db-floor-press', 'pushup-handles', 'machine-press'],
    category: 'press',
    sets: 3,
    repLow: 8,
    repHigh: 12,
    restSeconds: 75,
    painGated: true,
    note: 'Optional if the shoulder is calm. Skip rather than negotiate with pain.',
  },
  'assist-prehab-core': {
    id: 'assist-prehab-core',
    sessionType: 'assist',
    title: 'Prehab + core',
    plannedExerciseId: 'face-pull',
    swapPool: ['face-pull', 'band-pull-apart', 'plank'],
    category: 'prehab',
    sets: 3,
    repLow: 15,
    repHigh: 20,
    restSeconds: 45,
  },
}

export const SESSION_TEMPLATES: Record<SessionTemplateSpec['sessionType'], SessionTemplateSpec> = {
  squat: {
    sessionType: 'squat',
    accessorySlotIds: ['squat-quad', 'squat-hamstring', 'squat-triceps', 'squat-core'],
  },
  bench: {
    sessionType: 'bench',
    accessorySlotIds: ['bench-row', 'bench-pull', 'bench-press', 'bench-curl', 'bench-prehab'],
  },
  deadlift: {
    sessionType: 'deadlift',
    accessorySlotIds: ['deadlift-hinge', 'deadlift-back-ext', 'deadlift-row', 'deadlift-core'],
  },
  assist: {
    sessionType: 'assist',
    accessorySlotIds: [
      'assist-technique-squat',
      'assist-upper-back',
      'assist-vertical-pull',
      'assist-press-rehab',
      'assist-prehab-core',
    ],
  },
}

export const ACCESSORIES: Partial<Record<SessionType, AccessorySpec[]>> = Object.fromEntries(
  Object.entries(SESSION_TEMPLATES).map(([sessionType, template]) => [
    sessionType,
    template.accessorySlotIds.map((slotId) => {
      const slot = ACCESSORY_SLOTS[slotId]
      const exercise = DEFAULT_EXERCISE_LIBRARY[slot.plannedExerciseId]
      return {
        id: exercise.id,
        name: exercise.name,
        sets: slot.sets,
        repLow: slot.repLow,
        repHigh: slot.repHigh,
        note: slot.note ?? exercise.note,
        painGated: slot.painGated ?? exercise.painGated,
      }
    }),
  ]),
) as Partial<Record<SessionType, AccessorySpec[]>>

export const ACCESSORY_INCREMENT_KG = 2.5

export interface ChecklistItemSpec {
  id: string
  name: string
  group: 'splits' | 'prehab'
}

export const MOBILITY_CHECKLIST: readonly ChecklistItemSpec[] = [
  { id: 'front-split-l', name: 'Front split - left leg (2-3 x 60-120s)', group: 'splits' },
  { id: 'front-split-r', name: 'Front split - right leg (2-3 x 60-120s)', group: 'splits' },
  { id: 'side-split', name: 'Side / middle split (2-3 x 60-120s)', group: 'splits' },
  { id: 'pancake', name: 'Pancake / straddle (2-3 x 60-120s)', group: 'splits' },
  { id: 'face-pull-prehab', name: 'Face pulls (light, 2-3 x 15-25)', group: 'prehab' },
  { id: 'external-rotation', name: 'Band external rotation', group: 'prehab' },
  { id: 'scap', name: 'Scap control (wall slides / prone Y-T)', group: 'prehab' },
]

export const KNEE_TO_WALL_TARGET_CM = 12
