export const heroCopy = {
  eyebrow: 'Structured strength training without spreadsheet upkeep',
  headline: 'Keep the logic.',
  headlineAccent: 'Lose the spreadsheet.',
  subhead:
    'Pick a plan, log your reps and effort, and let Sheetless handle the progression math.',
  highlights: ['Transparent progression', 'Your training history stays with you', 'Real strength plans'],
}

export const comparisonCopy = {
  eyebrow: 'Why Sheetless',
  heading: "The old way worked. The upkeep didn't.",
  subhead:
    'Notebooks made training honest and spreadsheets made progression visible — and the longer you train, the more that history matters: working weights, rep PRs, missed targets, deloads, and estimated maxes. But after months of formulas, tabs, and copied weeks, the upkeep gets harder than the training itself. Sheetless keeps the useful data and removes the admin.',
  beforeLabel: 'Before · your spreadsheet',
  beforeFootnote: 'Which week am I on? Did the formula break again?',
  bridge: 'Sheetless keeps the history',
  afterLabel: 'After · Sheetless',
  afterFootnote: 'Readable history — one decision you can act on.',
  closing: 'Keep the data. Lose the maintenance.',
}

export const focusDemoCopy = {
  eyebrow: 'Focus Mode',
  heading: 'Built for between sets.',
  subhead:
    'No scrolling through tabs. No editing cells. Focus Mode keeps the next set obvious: weight, reps, effort, done.',
  hint: 'Live demo — log a set and watch it advance',
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
  | 'previous'
  | 'receipts'
  | 'history'
  | 'plan'

export type MarketingFeature = {
  id: MarketingFeatureId
  title: string
  body: string
}

export const marketingFeatures: MarketingFeature[] = [
  {
    id: 'adaptive',
    title: 'Adaptive progression',
    body: 'Log the work, then see whether the next call is add weight, hold, repeat, or deload.',
  },
  {
    id: 'focus',
    title: 'Focus Mode',
    body: 'A set-by-set logger for load, reps, and effort, built for use between hard sets.',
  },
  {
    id: 'previous',
    title: 'Previous comparable work',
    body: "See what you did last time before you choose today's load.",
  },
  {
    id: 'receipts',
    title: 'Progression receipts',
    body: 'Every recommendation keeps the rule and reason attached.',
  },
  {
    id: 'history',
    title: 'Real program history',
    body: 'Track main lifts, variations, accessories, substitutions, and progression decisions in one place.',
  },
  {
    id: 'plan',
    title: 'Find My Plan quiz',
    body: 'Answer a few plain questions and Sheetless points you toward a plan that fits your experience, days, and goals.',
  },
]

/** Two supporting lines under the features grid (absorb the removed "no mystery coach" and "plain language" sections). */
export const featuresFootnotes = [
  'No mystery coach — Sheetless follows the rules in your plan and shows the reason when something changes.',
  'Plain language comes first; RIR, e1RM, training maxes, and progression rules stay attached for lifters who want the detail.',
]

export const howItWorksCopy = {
  eyebrow: 'How it works',
  heading: 'Pick a plan. Log the session. Get the next call.',
  subhead:
    'Sheetless compares the plan to what you actually did, then shows the next progression decision with the reason attached.',
}

export const howItWorksSteps = [
  {
    title: 'Pick a plan',
    body: 'Start with a real strength program or a simple progression model.',
  },
  {
    title: 'Log what happened',
    body: 'Record load, reps, effort, misses, substitutions, and notes.',
  },
  {
    title: 'Review the next call',
    body: 'See why Sheetless recommends adding weight, holding, repeating, or deloading.',
  },
]

export const progressionReceiptCopy = {
  label: 'Progression receipt',
  context: 'Squat · Week 4',
  youHitLabel: 'You hit',
  youHitValue: '87.5 kg × 5',
  youHitNote: '2 reps in reserve · RIR 2',
  nextLabel: 'Next squat session',
  nextValue: '90 kg × 5',
  whyLabel: 'Why',
  whyBody:
    'You completed the target work with 2 reps in reserve. That clears the progression rule, so next squat session moves from 87.5 kg to 90 kg.',
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
    ],
  },
  {
    level: 'Intermediate',
    description: 'More weekly structure when straight-line progress needs better organization.',
    programs: [
      {
        name: 'Training Max Wave',
        meta: '4 days/week - Training-max wave',
        summary: 'A conservative training-max percentage wave with back-off work and accessories.',
      },
    ],
  },
  {
    level: 'Advanced',
    description: 'Higher-volume waves and top-set structures for lifters who need more planned variation.',
    programs: [
      {
        name: 'Old School Wave Powerbuilding',
        meta: '4 days/week - Plus-set waves',
        summary: 'Upper/lower wave structure with base and peak phases plus bodybuilding layers.',
      },
    ],
  },
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
  tagline: 'Transparent strength training without the spreadsheet maintenance.',
}

export const marketingNavLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how' },
  { label: 'Programs', href: '#programs' },
] as const
