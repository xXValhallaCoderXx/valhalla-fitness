/**
 * Sheetless design tokens — hand-lifted from the production web app
 * (valhalla-fitness: src/styles/mantine-theme.ts + src/styles/app.css).
 *
 * Spike gate 4: judge whether a hand-rolled token DS reads as "Sheetless"
 * on Android (Hermes) and expo web (react-native-web).
 *
 * Sources of the raw values:
 *  - Mantine palettes: action/accent/success/warning/danger/neutral tuples.
 *  - CSS variables resolver: --mantine-color-body/-text/-dimmed/-default/…,
 *    --vf-surface-*, --vf-<tone>-soft/-border/-text, focus ring/outline.
 *  - rem-based fontSizes/spacing/radius converted at 16px/rem.
 */
import { Platform, useColorScheme } from 'react-native'
import type { Tone, ToneFamily } from '@sheetless/tokens'

export type { Tone }

/** Palette families that have soft-fill badge/chip colors (web --vf-* vars + neutral). */
export type ToneName = ToneFamily

export interface ToneColors {
  /** Foreground for text/icons in this tone (web --vf-<tone>-text). */
  text: string
  /** Translucent fill for badges/chips (web --vf-<tone>-soft). */
  soft: string
  /** Translucent border pairing the soft fill (web --vf-<tone>-border). */
  border: string
}

export interface Theme {
  scheme: 'light' | 'dark'
  /** Page background (--mantine-color-body). */
  background: string
  /** Slightly raised app-shell background (--vf-bg-elevated). */
  backgroundElevated: string
  /** Card/panel surface (--mantine-color-default). */
  surface: string
  /** Recessed inset surface, StatCard background (--vf-surface-2). */
  surface2: string
  /** Deepest inset (--vf-surface-inset). */
  surfaceInset: string
  /** Text input background (web: default surface light / inset dark). */
  inputBackground: string
  /** Primary text (--mantine-color-text). */
  text: string
  /** Dimmed/secondary text (--mantine-color-dimmed). */
  textMuted: string
  /** Default hairline border (--mantine-color-default-border). */
  border: string
  /** Card outer border (--vf-card-border: transparent in light, visible in dark). */
  cardBorder: string
  /** Filled primary button background (action palette, primaryShade 6/5). */
  primaryFill: string
  /** Text on the filled primary button. */
  primaryFillText: string
  /** Focused input outline color (--vf-focus-outline). */
  focusOutline: string
  /** Focus ring halo (--vf-focus-ring). */
  focusRing: string
  /** Card shadow as a CSS box-shadow string (--vf-shadow-card); web only. */
  shadowCard: string
  tones: Record<ToneName, ToneColors>
}

export const themes: { light: Theme; dark: Theme } = {
  light: {
    scheme: 'light',
    background: '#f2f6f7',
    backgroundElevated: '#eaf1f3',
    surface: '#fbfdfc',
    surface2: '#f6faf9',
    surfaceInset: '#e1ebee',
    inputBackground: '#fbfdfc',
    text: '#152027',
    textMuted: '#60707a',
    border: '#d5e0e3',
    cardBorder: 'transparent',
    primaryFill: '#197f9a', // action[6]
    primaryFillText: '#ffffff',
    focusOutline: '#197f9a',
    focusRing: 'rgba(25, 127, 154, 0.2)',
    shadowCard: '0 1px 2px rgba(8, 17, 20, 0.05), 0 8px 24px -6px rgba(8, 17, 20, 0.1)',
    tones: {
      action: {
        text: '#12657b',
        soft: 'rgba(25, 127, 154, 0.1)',
        border: 'rgba(25, 127, 154, 0.26)',
      },
      accent: {
        text: '#654983',
        soft: 'rgba(101, 73, 131, 0.1)',
        border: 'rgba(101, 73, 131, 0.24)',
      },
      success: {
        text: '#385f2f',
        soft: 'rgba(71, 122, 57, 0.11)',
        border: 'rgba(71, 122, 57, 0.25)',
      },
      warning: {
        text: '#694b1b',
        soft: 'rgba(134, 97, 29, 0.13)',
        border: 'rgba(134, 97, 29, 0.29)',
      },
      danger: {
        text: '#8d2d43',
        soft: 'rgba(141, 45, 67, 0.1)',
        border: 'rgba(141, 45, 67, 0.24)',
      },
      neutral: {
        text: '#4c5960', // neutral[6]
        soft: 'rgba(76, 89, 96, 0.1)',
        border: 'rgba(76, 89, 96, 0.24)',
      },
    },
  },
  dark: {
    scheme: 'dark',
    background: '#081114',
    backgroundElevated: '#0c171b',
    surface: '#101b20',
    surface2: '#162328',
    surfaceInset: '#091317',
    inputBackground: '#091317',
    text: '#eef7f6',
    textMuted: '#98abb0',
    border: '#2a3a40',
    cardBorder: '#2a3a40',
    primaryFill: '#2f98b3', // action[5]
    primaryFillText: '#ffffff',
    focusOutline: '#7fc8dc',
    focusRing: 'rgba(127, 200, 220, 0.23)',
    shadowCard: '0 1px 2px rgba(0, 0, 0, 0.4), 0 10px 30px -8px rgba(0, 0, 0, 0.55)',
    tones: {
      action: {
        text: '#7fc8dc',
        soft: 'rgba(84, 176, 201, 0.17)',
        border: 'rgba(84, 176, 201, 0.36)',
      },
      accent: {
        text: '#b49bd4',
        soft: 'rgba(180, 155, 212, 0.15)',
        border: 'rgba(180, 155, 212, 0.33)',
      },
      success: {
        text: '#9aca8a',
        soft: 'rgba(154, 202, 138, 0.14)',
        border: 'rgba(154, 202, 138, 0.3)',
      },
      warning: {
        text: '#dfbe62',
        soft: 'rgba(223, 190, 98, 0.14)',
        border: 'rgba(223, 190, 98, 0.32)',
      },
      danger: {
        text: '#db8898',
        soft: 'rgba(219, 136, 152, 0.14)',
        border: 'rgba(219, 136, 152, 0.32)',
      },
      neutral: {
        text: '#c2cdd2', // neutral[3]
        soft: 'rgba(194, 205, 210, 0.12)',
        border: 'rgba(194, 205, 210, 0.28)',
      },
    },
  },
}

/** Web theme.radius, rem × 16 → px. */
export const radii = { xs: 4, sm: 8, md: 11, lg: 16, xl: 20 } as const

/** Web theme.spacing, rem × 16 → px. */
export const spacing = { xs: 6, sm: 10, md: 14, lg: 18, xl: 22 } as const

/**
 * Web theme.fontSizes, rem × 16 → px, plus the two off-scale sizes the web app
 * uses constantly: `caption` (0.625rem section labels / stat labels) and
 * `stat` (1.125rem vf-stat-value).
 */
export const fontSizes = {
  caption: 10,
  xs: 11,
  sm: 13,
  md: 14,
  lg: 16,
  xl: 18,
  stat: 18,
} as const

/**
 * Web stack is Inter-first. Native has no Inter bundled in this spike, so the
 * platform system font stands in (visual-fidelity caveat to judge separately).
 */
export const fontFamily = Platform.select({
  web: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  default: undefined,
})

/** Resolve a semantic tone to its themed text color (mirrors web toneColor()). */
export function toneColor(theme: Theme, tone?: Tone): string | undefined {
  if (!tone) return undefined
  switch (tone) {
    case 'default':
      return theme.text
    case 'dimmed':
      return theme.textMuted
    default:
      return theme.tones[tone].text
  }
}

export interface Tokens {
  theme: Theme
  isDark: boolean
  radii: typeof radii
  spacing: typeof spacing
  fontSizes: typeof fontSizes
}

/**
 * Scheme-aware tokens. Defaults to dark when the scheme is unknown, matching
 * the spike's dark-first assumption.
 */
export function useTokens(): Tokens {
  const scheme = useColorScheme()
  const theme = scheme === 'light' ? themes.light : themes.dark
  return { theme, isDark: theme.scheme === 'dark', radii, spacing, fontSizes }
}
