export const HISTORY_TAB_VALUES = [
  'overview',
  'strength',
  'body-load',
  'movements',
  'records',
  'sessions',
] as const

export type HistoryTab = (typeof HISTORY_TAB_VALUES)[number]
