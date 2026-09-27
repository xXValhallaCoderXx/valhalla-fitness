import { FIND_MY_PLAN_QUESTIONS, type FindMyPlanQuestion } from '@sheetless/domain/program/recommend-plan'

/** Native availability is an exact upper bound; two days must never silently mean three. */
export const NATIVE_FIND_MY_PLAN_QUESTIONS: FindMyPlanQuestion[] = FIND_MY_PLAN_QUESTIONS.map(question =>
  question.key === 'days' ? {
    ...question,
    helper: 'Choose the most days you can train in a normal week. Matches will fit within that limit.',
    options: [2, 3, 4, 5].map(days => ({
      value: days,
      label: `${days} days`,
      sub: `Up to ${days} training sessions a week`,
    })),
  } : question,
)

export function finderDaysParam(value: string | undefined): number | undefined {
  return value && /^[2-5]$/.test(value) ? Number(value) : undefined
}

export function nativeAnswerLabel(key: string, value: string | number | undefined) {
  const question = NATIVE_FIND_MY_PLAN_QUESTIONS.find(item => item.key === key)
  return question?.options.find(option => option.value === value)?.label ?? '—'
}
