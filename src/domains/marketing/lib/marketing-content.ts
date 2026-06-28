export const heroCopy = {
  eyebrow: 'Strength training without spreadsheet brain',
  headline: 'Stop guessing.',
  headlineAccent: 'Get stronger.',
  subhead:
    'Sheetless gives beginner-friendly strength plans, fast workout logging, and plain-language coaching receipts that explain exactly why your next workout changes.',
  highlights: ['9 built-in programs', 'Adaptive progression', 'No spreadsheet required'],
}

export const comparisonCopy = {
  eyebrow: 'From spreadsheet to Sheetless',
  heading: "The spreadsheet got you started. It won't get you stronger.",
  subhead:
    "You shouldn't have to maintain formulas to train well. Log what happened — Sheetless does the progression math and hands you the decision in plain language.",
  beforeLabel: 'Before · your spreadsheet',
  beforeFootnote: 'Which week am I on? Did the formula break again?',
  bridge: 'Sheetless does the math',
  afterLabel: 'After · Sheetless',
  afterFootnote: 'One decision, in words you can act on.',
}

export const focusDemoCopy = {
  eyebrow: 'Focus Mode',
  heading: 'Your whole session, logged in seconds.',
  subhead:
    "Tap a set as you finish it, mark how it felt, and keep moving. Sheetless tracks the rest and turns it into tomorrow's prescription.",
  hint: 'Live demo — tap the sets and RIR',
}

export const focusDemoBullets = [
  {
    title: 'Tap a set to log it',
    body: 'One tap marks the set complete and banks the weight and reps.',
  },
  {
    title: 'RIR is effort, not failure',
    body: 'Log how many reps you had left — or skip it and just train.',
  },
  {
    title: 'Tomorrow is already decided',
    body: 'Finish the session and your next loads are set automatically.',
  },
]

export type MarketingFeatureId =
  | 'adaptive'
  | 'focus'
  | 'plan'
  | 'metrics'
  | 'fatigue'
  | 'records'

export type MarketingFeature = {
  id: MarketingFeatureId
  title: string
  body: string
}

export const marketingFeatures: MarketingFeature[] = [
  {
    id: 'adaptive',
    title: 'Adaptive progression',
    body: 'Log what happened, then get a clear coaching receipt for the next load, repeat target, or hold.',
  },
  {
    id: 'focus',
    title: 'Focus Mode',
    body: 'A simple set-by-set screen keeps attention on load, reps, and RIR without turning training into spreadsheet work.',
  },
  {
    id: 'plan',
    title: 'Find My Plan quiz',
    body: 'Answer a few plain questions and Sheetless points you toward a plan that fits your experience, days, and goals.',
  },
  {
    id: 'metrics',
    title: 'RIR and estimated 1RM',
    body: 'Use reps in reserve when you know it, or just log reps. Sheetless turns the work into useful strength signals.',
  },
  {
    id: 'fatigue',
    title: 'Muscle fatigue tiers',
    body: 'Fresh, Light, Worked hard, and Very fatigued tiers make recent workload easy to read before you train.',
  },
  {
    id: 'records',
    title: 'Records and insights',
    body: 'See PRs, recent history, muscle trends, and progression decisions without hunting through old workout notes.',
  },
]

export const howItWorksSteps = [
  {
    label: 'Load',
    title: 'Pick the right plan',
    body: 'Start from one of nine built-in strength programs, or use the quiz when you are not sure what fits.',
  },
  {
    label: 'Log',
    title: 'Record the real session',
    body: 'Track completed, partial, and missed work quickly. Good training data should not require perfect workouts.',
  },
  {
    label: 'Adapt',
    title: 'Know what changed',
    body: 'Sheetless turns your result into the next prescription and explains the decision in normal language.',
  },
]

export type ProgramShowcaseGroup = {
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  description: string
  programs: {
    name: string
    meta: string
    summary: string
  }[]
}

export const programShowcaseGroups: ProgramShowcaseGroup[] = [
  {
    level: 'Beginner',
    description: 'Simple progression, clear starting loads, and enough structure to build the habit.',
    programs: [
      {
        name: 'Beginner 5x5 Linear',
        meta: '3 days/week - Working-load LP',
        summary: 'Alternating A/B full-body sessions with 5x5 work and simple accessories.',
      },
      {
        name: 'Beginner Upper/Lower',
        meta: '4 days/week - Working-load LP',
        summary: 'A beginner upper/lower split for more weekly practice without extra complexity.',
      },
    ],
  },
  {
    level: 'Intermediate',
    description: 'More weekly structure when straight-line progress needs better organization.',
    programs: [
      {
        name: 'Ramping 5x5',
        meta: '3 days/week - Weekly working-load LP',
        summary: 'Heavy, recovery, and volume days with loads climbing week to week.',
      },
      {
        name: 'Training Max Wave',
        meta: '4 days/week - Training-max wave',
        summary: 'A conservative training-max percentage wave with back-off work and accessories.',
      },
      {
        name: 'Power + Hypertrophy U/L',
        meta: '4 days/week - Power LP + hypertrophy',
        summary: 'Two heavy power days plus two higher-rep hypertrophy days for size and strength.',
      },
    ],
  },
  {
    level: 'Advanced',
    description: 'Higher-volume waves and top-set structures for lifters who need more planned variation.',
    programs: [
      {
        name: '3-Day Strength',
        meta: '3 days/week - Volume to intensity',
        summary: 'Volume, recovery, and intensity days built around weekly top-set progress.',
      },
      {
        name: 'Old School Wave Powerbuilding',
        meta: '4 days/week - Plus-set waves',
        summary: 'Upper/lower wave structure with base and peak phases plus bodybuilding layers.',
      },
      {
        name: 'Classic Volume Strength',
        meta: '4 days/week - Base-to-peak waves',
        summary: 'Volumizing and intensifying waves with variations and accessories.',
      },
      {
        name: 'Volume-Intensity Strength',
        meta: '3 days/week - Alternating waves',
        summary: 'Whole-body training alternating volume waves with top-set intensity waves.',
      },
    ],
  },
]

export const beginnerFriendlyPoints = [
  'Plain language comes first; the technical detail is there as quiet proof.',
  'Partial sessions and missed targets still count, so the next workout reflects what actually happened.',
  'No jargon is required: log load, reps, and effort when you can, then let Sheetless do the translation.',
]

/** Themed accent token per program level, used for the legend dots and card top accents. */
export const programLevelColor: Record<ProgramShowcaseGroup['level'], string> = {
  Beginner: 'var(--vf-success-text)',
  Intermediate: 'var(--vf-action-text)',
  Advanced: 'var(--vf-warning-text)',
}

/** Flattened program list (keeps the level) for the showcase card grid. */
export const programShowcaseCards = programShowcaseGroups.flatMap((group) =>
  group.programs.map((program) => ({ ...program, level: group.level })),
)

export const footerNav = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How it works', href: '#how' },
      { label: 'Programs', href: '#programs' },
    ],
  },
  {
    title: 'Get started',
    links: [
      { label: 'Create account', to: '/auth' },
      { label: 'Sign in', to: '/auth' },
      { label: 'Find My Plan quiz', to: '/auth' },
    ],
  },
] as const

export const footerLegal = {
  copyright:
    '© 2026 Sheetless. Built-in programs are original Sheetless tools, not affiliated with any coach or book.',
  tagline: 'Strength training without spreadsheet brain.',
}

export const marketingNavLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how' },
  { label: 'Programs', href: '#programs' },
] as const

