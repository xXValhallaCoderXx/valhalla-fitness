import { FIND_MY_PLAN_QUESTIONS } from '~/domains/program/lib/recommend-plan'

export type WizardAnswers = Partial<Record<'experience' | 'days' | 'goal', string | number>>

export const RECAP_KEYS = ['experience', 'days', 'goal'] as const

const TAG_LABELS: Record<string, string> = {
  '5x5': '5×5',
  'upper-lower': 'Upper/Lower',
  'training max': 'Training max',
  'high volume': 'High volume',
}

export function tagLabel(tag: string) {
  return TAG_LABELS[tag] ?? tag.charAt(0).toUpperCase() + tag.slice(1)
}

export function levelTone(complexity: string): 'success' | 'action' | 'warning' {
  if (complexity === 'Beginner') return 'success'
  if (complexity === 'Advanced') return 'warning'
  return 'action'
}

export function answerLabel(key: string, value: string | number | undefined) {
  const question = FIND_MY_PLAN_QUESTIONS.find((item) => item.key === key)
  return question?.options.find((option) => option.value === value)?.label ?? '—'
}
