import type { DriveStep } from 'driver.js'

/** Spotlight the visible nav for the current breakpoint (desktop header vs mobile bottom bar). */
function navSelector(slug: string) {
  const desktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  return `[data-tour="${desktop ? 'nav' : 'mnav'}-${slug}"]`
}

export function buildOnboardingSteps(): DriveStep[] {
  return [
    {
      popover: {
        title: 'Welcome to Sheetless 👋',
        description: 'A 30-second tour of where everything lives. You can replay it anytime from Settings.',
      },
    },
    {
      element: navSelector('today'),
      popover: { title: 'Today', description: 'Your workout for the day — start or resume your session right here.' },
    },
    {
      element: navSelector('program'),
      popover: { title: 'Your Plan', description: 'See where you are in your training block and what comes next.' },
    },
    {
      element: navSelector('history'),
      popover: { title: 'Insights', description: 'Track your progress — volume, records, and muscle fatigue.' },
    },
    {
      element: navSelector('templates'),
      popover: { title: 'Plans', description: 'Browse training plans, or tap "Find my plan" to get a recommendation.' },
    },
    {
      popover: {
        title: 'Your first steps',
        description: 'Use the getting-started checklist on Today to pick a plan, set your numbers, and log your first workout.',
      },
    },
  ]
}
