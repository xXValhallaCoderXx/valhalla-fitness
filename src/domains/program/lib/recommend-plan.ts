import type { ProgramTemplateSummary } from '~/shared/types'

export type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Advanced'
export type PlanGoal = 'simple' | 'strength' | 'muscle'

export type FindMyPlanAnswers = {
  experience: ExperienceLevel
  /** Training days per week the user can commit to (3, 4, or 5). */
  days: number
  goal: PlanGoal
}

export type PlanRecommendation = {
  template: ProgramTemplateSummary
  reason: string
}

export const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string }[] = [
  { value: 'Beginner', label: 'New to lifting' },
  { value: 'Intermediate', label: 'Some experience' },
  { value: 'Advanced', label: 'Very experienced' },
]

export const DAYS_OPTIONS: { value: number; label: string }[] = [
  { value: 3, label: '2–3 days' },
  { value: 4, label: '4 days' },
  { value: 5, label: '5+ days' },
]

export const GOAL_OPTIONS: { value: PlanGoal; label: string; phrase: string; tags: string[] }[] = [
  { value: 'simple', label: 'Keep it simple', phrase: 'a simple, steady start', tags: ['beginner', 'linear', '5x5'] },
  { value: 'strength', label: 'Get stronger', phrase: 'building maximal strength', tags: ['strength', 'training max', 'wave', 'peak', 'intensity'] },
  { value: 'muscle', label: 'Muscle + strength', phrase: 'muscle and strength together', tags: ['powerbuilding', 'volume', 'high volume', 'hypertrophy'] },
]

/**
 * Ordered questions driving the step-by-step picker. Adding a question later is data-only
 * (extend this array + the matching field on {@link FindMyPlanAnswers}); the wizard renders
 * whatever is here.
 */
export type FindMyPlanQuestion = {
  key: keyof FindMyPlanAnswers
  title: string
  helper: string
  options: { value: string | number; label: string; sub: string }[]
}

export const FIND_MY_PLAN_QUESTIONS: FindMyPlanQuestion[] = [
  {
    key: 'experience',
    title: 'How much lifting experience do you have?',
    helper: "No wrong answer — we'll match the structure to you.",
    options: [
      { value: 'Beginner', label: 'New to lifting', sub: 'Under 6 months, or coming back' },
      { value: 'Intermediate', label: 'Some experience', sub: 'Training fairly consistently' },
      { value: 'Advanced', label: 'Very experienced', sub: 'Years under the bar' },
    ],
  },
  {
    key: 'days',
    title: 'How many days a week can you train?',
    helper: 'Be honest about your week — consistency beats ambition.',
    options: [
      { value: 3, label: '2–3 days', sub: 'A shorter week' },
      { value: 4, label: '4 days', sub: 'More frequency' },
      { value: 5, label: '5+ days', sub: 'Higher frequency' },
    ],
  },
  {
    key: 'goal',
    title: "What's your main goal right now?",
    helper: 'You can switch focus later as you progress.',
    options: [
      { value: 'simple', label: 'Keep it simple', sub: 'Build the habit' },
      { value: 'strength', label: 'Get stronger', sub: 'Chase the numbers' },
      { value: 'muscle', label: 'Muscle + strength', sub: 'Size and power' },
    ],
  },
]

/** Plain-English, tap-to-explain blurbs for the plan tags shown on the result. */
export const TAG_GLOSSARY: Record<string, string> = {
  linear: 'Linear progression — add a little weight each session you complete all your reps.',
  '5x5': '5×5 — five sets of five reps on your main lifts.',
  beginner: 'Beginner — built for lifters new to structured training.',
  'upper-lower': 'Upper/Lower — alternate upper-body and lower-body days.',
  strength: 'Strength — focused on lifting heavier over time.',
  'training max': 'Training max — a working number (~90% of your best) your percentages are based on.',
  wave: 'Wave — loads build over a few weeks, then reset a little heavier.',
  volume: 'Volume — higher total sets and reps to drive the adaptation.',
  'high volume': 'High volume — extended, higher-set training for work capacity and size.',
  hypertrophy: 'Hypertrophy — higher-rep work aimed at muscle size.',
  powerbuilding: 'Powerbuilding — heavy strength work plus muscle-building volume.',
  peak: 'Peak — a phase that sharpens strength toward a heavy top set.',
  intensity: 'Intensity — how heavy the weight is relative to your max.',
  ppl: 'Push/Pull/Legs — rotate pushing, pulling, and leg days across the week.',
  arms: 'Arms — extra direct biceps and triceps volume.',
  '5-day': 'Five-day — a higher-frequency week with five training days.',
  bodybuilding: 'Bodybuilding — training organised around individual muscle groups for size.',
  'bro split': 'Bro split — one major muscle group per day across the week.',
}

const EXPERIENCE_RANK: Record<string, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 }

function rank(complexity: string) {
  return EXPERIENCE_RANK[complexity] ?? 1
}

function scoreTemplate(template: ProgramTemplateSummary, answers: FindMyPlanAnswers, goalTags: string[]) {
  let score = 0
  // Closeness in experience level matters most.
  const experienceDiff = Math.abs(rank(template.complexity) - rank(answers.experience))
  score += experienceDiff === 0 ? 4 : experienceDiff === 1 ? 2 : 0
  // Schedule fit.
  const dayDiff = Math.abs(template.daysPerWeek - answers.days)
  score += dayDiff === 0 ? 3 : dayDiff === 1 ? 1 : 0
  // Goal fit via tag overlap.
  const tags = template.tags.map((tag) => tag.toLowerCase())
  const tagHits = goalTags.filter((tag) => tags.includes(tag)).length
  score += Math.min(tagHits, 2) * 2
  return score
}

function buildReason(template: ProgramTemplateSummary, goalPhrase: string) {
  return `A ${template.complexity.toLowerCase()} plan at ${template.daysPerWeek} days a week — a good fit for ${goalPhrase}.`
}

/**
 * Rank the available plans for the user's answers, best fit first (up to `limit`). Pure +
 * deterministic so it can be unit-tested and run live in the UI as answers change.
 */
export function recommendPlans(
  templates: ProgramTemplateSummary[],
  answers: FindMyPlanAnswers,
  limit = 3,
): PlanRecommendation[] {
  const candidates = templates.filter((template) => template.available)
  if (!candidates.length) return []

  const goal = GOAL_OPTIONS.find((option) => option.value === answers.goal) ?? GOAL_OPTIONS[0]
  return candidates
    .map((template) => ({ template, score: scoreTemplate(template, answers, goal.tags) }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        // Tie-break toward the more accessible level, then the closer schedule, then a stable id
        // order so equal-scoring plans never depend on catalogue array position.
        rank(left.template.complexity) - rank(right.template.complexity) ||
        Math.abs(left.template.daysPerWeek - answers.days) - Math.abs(right.template.daysPerWeek - answers.days) ||
        left.template.id.localeCompare(right.template.id),
    )
    .slice(0, Math.max(0, limit))
    .map(({ template }) => ({ template, reason: buildReason(template, goal.phrase) }))
}

/** The single best-fitting plan (the top of {@link recommendPlans}), or null when none are available. */
export function recommendPlan(
  templates: ProgramTemplateSummary[],
  answers: FindMyPlanAnswers,
): PlanRecommendation | null {
  return recommendPlans(templates, answers, 1)[0] ?? null
}
