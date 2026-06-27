import type { ProgramTemplateSummary } from '~/shared/types'

export type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Advanced'
export type PlanGoal = 'simple' | 'strength' | 'muscle'

export type FindMyPlanAnswers = {
  experience: ExperienceLevel
  /** Training days per week the user can commit to (3 or 4). */
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
  { value: 4, label: '4+ days' },
]

export const GOAL_OPTIONS: { value: PlanGoal; label: string; phrase: string; tags: string[] }[] = [
  { value: 'simple', label: 'Keep it simple', phrase: 'a simple, steady start', tags: ['beginner', 'linear', '5x5'] },
  { value: 'strength', label: 'Get stronger', phrase: 'building maximal strength', tags: ['strength', 'training max', 'wave', 'peak', 'intensity'] },
  { value: 'muscle', label: 'Muscle + strength', phrase: 'muscle and strength together', tags: ['powerbuilding', 'volume', 'high volume'] },
]

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
 * Pick the single best-fitting plan for the user's answers. Returns null when no
 * templates are available. Pure + deterministic so it can be unit-tested and run
 * live in the UI as answers change.
 */
export function recommendPlan(
  templates: ProgramTemplateSummary[],
  answers: FindMyPlanAnswers,
): PlanRecommendation | null {
  const candidates = templates.filter((template) => template.available)
  if (!candidates.length) return null

  const goal = GOAL_OPTIONS.find((option) => option.value === answers.goal) ?? GOAL_OPTIONS[0]
  const best = candidates
    .map((template) => ({ template, score: scoreTemplate(template, answers, goal.tags) }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        // Tie-break toward the more accessible level, then the closer schedule.
        rank(left.template.complexity) - rank(right.template.complexity) ||
        Math.abs(left.template.daysPerWeek - answers.days) - Math.abs(right.template.daysPerWeek - answers.days),
    )[0]

  return { template: best.template, reason: buildReason(best.template, goal.phrase) }
}
