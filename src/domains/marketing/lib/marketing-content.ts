export const heroCopy = {
  eyebrow: 'Back-to-basics strength training',
  headline: 'Keep the logic.',
  headlineAccent: 'Lose the spreadsheet.',
  subhead:
    'Sheetless turns the notebook-and-spreadsheet approach to strength training into a simple app. Pick a plan, log your reps and effort, and see exactly why your next workout changes.',
  highlights: ['No black-box AI', 'Transparent progression', 'Real strength programs'],
}

export const philosophyCopy = {
  eyebrow: 'Why Sheetless',
  heading: 'Back to basics, not backwards.',
  body1:
    'A notebook teaches you to pay attention. A spreadsheet teaches you how progression works. Sheetless keeps that discipline and removes the admin.',
  body2:
    'No random workouts. No mystery algorithm. No formulas between sets — just a plan, a log, and a clear next step.',
  chips: ['Random workouts', 'Mystery algorithms', 'Formulas between sets'],
}

export const comparisonCopy = {
  eyebrow: 'From spreadsheet to Sheetless',
  heading: 'The spreadsheet was never the problem.',
  subhead:
    'Spreadsheets taught a lot of us how training works — sets, reps, percentages, estimated maxes, progression rules. They made the logic visible. They just were not built for the gym floor. Sheetless keeps the useful part and removes the broken formulas, hidden tabs, and guesswork between sets.',
  beforeLabel: 'Before · your spreadsheet',
  beforeFootnote: 'Which week am I on? Did the formula break again?',
  bridge: 'Sheetless keeps the logic',
  afterLabel: 'After · Sheetless',
  afterFootnote: 'Same rules — one decision you can act on.',
  closing: 'Keep the thinking. Lose the maintenance.',
}

export type NoBlackBoxPoint = {
  title: string
  body: string
}

export const noBlackBoxCopy = {
  eyebrow: 'No black box',
  heading: 'Not an AI coach. A training system that shows its work.',
  subhead:
    'Sheetless does not invent your workout from a prompt. It follows transparent progression rules based on your plan, your reps, your effort, and your history. When your next weight changes, you see why.',
}

export const noBlackBoxPoints: NoBlackBoxPoint[] = [
  {
    title: 'Rules over vibes',
    body: 'Progression comes from your plan, not a mystery recommendation.',
  },
  {
    title: 'Receipts over guesses',
    body: 'Every change has a reason attached.',
  },
  {
    title: 'You stay in the loop',
    body: 'Sheetless helps you understand your training instead of hiding it.',
  },
]

export const focusDemoCopy = {
  eyebrow: 'Focus Mode',
  heading: 'Built for between sets.',
  subhead:
    'No scrolling through a spreadsheet, no editing cells. Focus Mode keeps the next set obvious — weight, reps, effort, done — with the technical detail nearby for lifters who want it.',
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
    label: 'Plan',
    title: 'Pick a real strength plan',
    body: 'Choose a built-in strength program, or answer a few questions and let Sheetless recommend one.',
  },
  {
    label: 'Log',
    title: 'Record the real session',
    body: 'Track completed, partial, and missed work — reps, effort, and rest. Good training data should not require perfect workouts.',
  },
  {
    label: 'Learn',
    title: 'See what it means',
    body: 'Sheetless reads your performance back in plain language, with the progression rule it used.',
  },
  {
    label: 'Adapt',
    title: 'Get the next call',
    body: 'Your next workout is ready, with the reason attached — no spreadsheet to update.',
  },
]

export const coachingReceiptCopy = {
  eyebrow: 'Coaching receipts',
  heading: 'Every workout ends with a reason.',
  subhead:
    'Most apps tell you what you did. Sheetless tells you what it means — then turns it into your next prescription.',
  context: 'Squat · Week 4',
  youHitLabel: 'You hit',
  youHitValue: '87.5 kg × 5',
  youHitNote: 'about 2 reps left · RIR 2',
  nextLabel: 'Next squat session',
  nextValue: '90 kg × 5',
  whyLabel: 'Why',
  whyBody:
    'You completed the target work with effort to spare, so Sheetless adds 2.5 kg next time.',
  footnote: 'No guessing. No spreadsheet editing. No black box.',
}

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
  'Plain language comes first; the technical term stays attached as quiet proof.',
  'Partial sessions and missed targets still count, so the next workout reflects what actually happened.',
  'No jargon required: log load, reps, and effort, and let Sheetless do the translation.',
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
  tagline: 'Transparent strength training — no black box, no spreadsheet maintenance.',
}

export const marketingNavLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how' },
  { label: 'Programs', href: '#programs' },
] as const
