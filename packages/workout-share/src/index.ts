import type { WorkoutShareModel } from '@sheetless/domain/history/workout-share'

export const WORKOUT_SHARE_WIDTH = 1080
export const WORKOUT_SHARE_HEIGHT = 1350
export type ShareScheme = 'light' | 'dark'

const palettes = {
  light: { background: '#f2f6f7', surface: '#fbfdfc', text: '#152027', muted: '#60707a', line: '#d5e0e3', action: '#12657b', accent: '#654983' },
  dark: { background: '#081114', surface: '#101b20', text: '#eef7f6', muted: '#98abb0', line: '#2a3a40', action: '#7fc8dc', accent: '#b49bd4' },
}

function clean(value: string): string {
  return Array.from(value).filter((char) => {
    const cp = char.codePointAt(0)!
    return cp === 9 || cp === 10 || cp === 13 || (cp >= 32 && cp <= 0xd7ff) ||
      (cp >= 0xe000 && cp <= 0xfffd) || (cp >= 0x10000 && cp <= 0x10ffff)
  }).join('').replace(/\s+/gu, ' ').trim()
}

function escape(value: string): string {
  return clean(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

// Deliberately conservative, independent of installed fonts. Keep graphemes intact.
const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })
function takeLine(value: string, limit: number): [string, string] {
  const parts = [...segmenter.segment(clean(value))].map((part) => part.segment)
  let count = 0
  let index = 0
  for (; index < parts.length; index++) {
    const width = /^[\x20-\x7e]+$/.test(parts[index]) ? 0.72 : 1.15
    if (count + width > limit) break
    count += width
  }
  return [parts.slice(0, index).join(''), parts.slice(index).join('')]
}

function truncate(value: string, limit: number): string {
  const [line, rest] = takeLine(value, limit - 1.2)
  return rest ? `${line.trimEnd()}…` : line
}

export function shareDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`
  const minutes = Math.floor(seconds / 60)
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export function describeWorkoutShare(model: WorkoutShareModel): string {
  return [
    'Sheetless.', clean(model.title) + '.', model.dateLabel + '.', `${model.completedSets} completed sets.`,
    model.durationSeconds !== null ? `${shareDuration(model.durationSeconds)} elapsed.` : '',
    `${model.prCount} exercises with personal records.`,
    ...model.exercises.map((row) => `${clean(row.name)}: ${row.result}${row.isPr ? ', personal record' : ''}.`),
    model.overflowCount ? `Plus ${model.overflowCount} more exercises.` : '',
  ].filter(Boolean).join(' ')
}

export function renderWorkoutShareSvg(model: WorkoutShareModel, scheme: ShareScheme): string {
  const c = palettes[scheme]
  const text = (x: number, y: number, value: string, size: number, fill = c.text, weight = 400) =>
    `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}">${escape(value)}</text>`
  const [title, rest] = takeLine(model.title, 16)
  const stats = [
    [String(model.completedSets), 'COMPLETED SETS'],
    ...(model.durationSeconds !== null ? [[shareDuration(model.durationSeconds), 'ELAPSED']] : []),
    [String(model.prCount), 'EXERCISES WITH PRs'],
  ]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WORKOUT_SHARE_WIDTH}" height="${WORKOUT_SHARE_HEIGHT}" viewBox="0 0 1080 1350">
<rect width="1080" height="1350" fill="${c.background}"/>
<g font-family="sans-serif">
<path d="M64 70h18v42H64zM42 80h18v22H42zM86 86h34v10H86zM124 70h18v42h-18zM146 80h18v22h-18z" fill="${c.action}"/>
${text(188, 104, 'SHEETLESS', 30, c.action, 700)}
${text(64, 167, 'WORKOUT COMPLETE', 22, c.muted, 700)}
${text(64, 246, title, 56, c.text, 700)}
${rest ? text(64, 313, truncate(rest, 16), 56, c.text, 700) : ''}
${text(64, 365, model.dateLabel, 28, c.muted)}
<rect x="64" y="405" width="952" height="138" rx="24" fill="${c.surface}"/>
${stats.map(([value, label], index) => {
    const x = 90 + index * (922 / stats.length)
    return text(x, 469, value, 42, c.action, 700) + text(x, 512, label, 18, c.muted, 700)
  }).join('')}
${text(64, 598, 'WORKOUT HIGHLIGHTS', 22, c.muted, 700)}
${model.exercises.map((row, index) => {
    const y = 630 + index * 88
    return `${text(64, y + 28, truncate(row.name, 23), 30, c.text, 600)}
${row.isPr ? text(954, y + 28, 'PR', 25, c.accent, 700) : ''}
${text(64, y + 63, truncate(row.result, 48), 26, row.isPr ? c.accent : c.action, 600)}
<path d="M64 ${y + 79}H1016" stroke="${c.line}"/>`
  }).join('')}
${model.overflowCount ? text(64, 1203, `+${model.overflowCount} more exercises`, 26, c.muted) : ''}
<path d="M64 1250H1016" stroke="${c.line}"/>
${text(64, 1301, 'Show up. Get stronger.', 24, c.muted)}
${text(797, 1301, 'SHEETLESS', 24, c.action, 700)}
</g></svg>`
}
