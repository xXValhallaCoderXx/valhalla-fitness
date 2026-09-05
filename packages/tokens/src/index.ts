/**
 * Platform-agnostic design-token names shared by every Sheetless app shell.
 *
 * Each shell resolves these semantic names with its own mechanism: the web app
 * maps them to themed CSS variables (`apps/web/src/components/atoms/tone.ts`),
 * a native app maps them to concrete color values per color scheme.
 */
export type Tone =
  | 'default'
  | 'dimmed'
  | 'action'
  | 'success'
  | 'warning'
  | 'danger'
  | 'accent'

export const tones: readonly Tone[] = [
  'default',
  'dimmed',
  'action',
  'success',
  'warning',
  'danger',
  'accent',
]

/** Tones that carry a themed fill/badge family (subset of Tone plus neutral). */
export type ToneFamily = 'action' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral'
