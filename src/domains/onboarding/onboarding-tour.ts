import type { DriveStep } from 'driver.js'

/** Spotlight the visible nav for the current breakpoint (desktop header vs mobile bottom bar). */
function navSelector(slug: string) {
  const desktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  return `[data-tour="${desktop ? 'nav' : 'mnav'}-${slug}"]`
}

export function buildOnboardingSteps(): DriveStep[] {
  return [
    {
      data: { stepId: 'welcome' },
      popover: {
        title: 'Welcome to Sheetless 👋',
        description: 'A 30-second tour of where everything lives. You can replay it anytime from Settings.',
      },
    },
    {
      element: navSelector('today'),
      data: { stepId: 'today' },
      popover: { title: 'Today', description: 'Your workout for the day — start or resume your session right here.' },
    },
    {
      element: navSelector('program'),
      data: { stepId: 'program' },
      popover: { title: 'Your Plan', description: 'See where you are in your training block and what comes next.' },
    },
    {
      element: navSelector('history'),
      data: { stepId: 'history' },
      popover: { title: 'Insights', description: 'Track your progress — volume, records, and muscle fatigue.' },
    },
    {
      element: navSelector('templates'),
      data: { stepId: 'templates' },
      popover: { title: 'Plans', description: 'Browse training plans, or tap "Find my plan" to get a recommendation.' },
    },
    {
      data: { stepId: 'first-steps' },
      popover: {
        title: 'Your first steps',
        description: 'Use the getting-started checklist on Today to set your numbers, pick a plan, and log your first workout.',
      },
    },
  ]
}

/** Spotlight a live-session element. These are content elements, so no breakpoint switch. */
const liveSelector = (slug: string) => `[data-tour="live-${slug}"]`

/** Coach-marks for a user's first live workout: movement → weight → RIR → complete → finish. */
export function buildLiveSessionSteps(): DriveStep[] {
  return [
    {
      element: liveSelector('movement'),
      data: { stepId: 'movement' },
      popover: {
        title: 'Your current movement',
        description: 'The highlighted card is your active lift. Switch movements from the list any time.',
      },
    },
    {
      element: liveSelector('weight'),
      data: { stepId: 'weight' },
      popover: {
        title: 'Log the weight',
        description: 'Type what you lifted, or nudge it with the quick +/− buttons under the row.',
      },
    },
    {
      element: liveSelector('rir'),
      data: { stepId: 'rir' },
      popover: {
        title: 'Rate the effort (RIR)',
        description: 'RIR is how many more reps you had left. Sheetless uses it to set up your next session.',
      },
    },
    {
      element: liveSelector('complete'),
      data: { stepId: 'complete' },
      popover: {
        title: 'Complete the set',
        description: 'Tap the check to log it — the next set unlocks automatically.',
      },
    },
    {
      element: liveSelector('finish'),
      data: { stepId: 'finish' },
      popover: {
        title: "Finish when you're done",
        description: 'Hit Finish to save the session and unlock your next one.',
      },
    },
  ]
}

/** Spotlight a focus-mode (single-set logger) element. */
const focusSelector = (slug: string) => `[data-tour="focus-${slug}"]`

/** Coach-marks for the mobile focus logger: lift → weight → RIR → log set. */
export function buildFocusSessionSteps(): DriveStep[] {
  return [
    {
      element: focusSelector('exercise'),
      data: { stepId: 'exercise' },
      popover: {
        title: 'Your current lift',
        description: 'Move between exercises with the arrows, and tap History to see past sessions.',
      },
    },
    {
      element: focusSelector('weight'),
      data: { stepId: 'weight' },
      popover: {
        title: 'Log the weight',
        description: 'Tap − or + to adjust, or tap the number to type what you lifted.',
      },
    },
    {
      element: focusSelector('rir'),
      data: { stepId: 'rir' },
      popover: {
        title: 'Rate the effort (RIR)',
        description: 'How many reps you had left — Sheetless uses it to set up your next session.',
      },
    },
    {
      element: focusSelector('log'),
      data: { stepId: 'log' },
      popover: {
        title: 'Log the set',
        description: 'Save it and jump to the next set automatically.',
      },
    },
  ]
}

/** Spotlight a Settings element. */
const settingsSelector = (slug: string) => `[data-tour="settings-${slug}"]`

/** Coach-marks for the strength-estimates section, opened from the checklist "Set estimates" CTA. */
export function buildEstimatesSteps(): DriveStep[] {
  return [
    {
      element: settingsSelector('estimates'),
      data: { stepId: 'inputs' },
      popover: {
        title: 'Enter your estimates',
        description: 'Add a recent best for each main lift — Sheetless turns these into sensible starting weights for your plan.',
      },
    },
    {
      element: settingsSelector('e1rm-calc'),
      data: { stepId: 'calculator' },
      popover: {
        title: "Don't know your max?",
        description: 'Tap "Calculate from known sets", enter a weight and reps you\'ve hit, and we\'ll estimate your 1-rep max.',
      },
    },
  ]
}
