import type { Tone } from '~/components/atoms/tone'

export type PasswordStrength = {
  /** 0 (empty / too short) through 4 (strong). */
  score: 0 | 1 | 2 | 3 | 4
  label: string
  tone: Extract<Tone, 'danger' | 'warning' | 'success'>
  /** Fill width for the strength meter, 0–100. */
  widthPct: number
}

// Colocated with the domain (labels live near their logic, per the repo convention). The caller
// maps `tone` to a themed colour via `toneColor`, so this module stays UI-agnostic and testable.
const STRENGTH_STEPS: Record<0 | 1 | 2 | 3 | 4, PasswordStrength> = {
  0: { score: 0, label: 'Too short', tone: 'danger', widthPct: 0 },
  1: { score: 1, label: 'Weak', tone: 'danger', widthPct: 35 },
  2: { score: 2, label: 'Fair', tone: 'warning', widthPct: 62 },
  3: { score: 3, label: 'Good', tone: 'success', widthPct: 82 },
  4: { score: 4, label: 'Strong', tone: 'success', widthPct: 100 },
}

/**
 * Score a password 0–4 for the sign-up strength meter. Heuristic matches the imported Login
 * design: +1 for ≥6 chars, +1 for ≥10 chars, +1 for mixing letters & digits, +1 for a symbol.
 */
export function scorePasswordStrength(password: string): PasswordStrength {
  if (!password) return STRENGTH_STEPS[0]
  let score = 0
  if (password.length >= 6) score += 1
  if (password.length >= 10) score += 1
  if (/[0-9]/.test(password) && /[a-zA-Z]/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 1
  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4
  return STRENGTH_STEPS[clamped]
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Lightweight client-side email check — gates the submit action and the inline "valid" tick. */
export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim())
}
