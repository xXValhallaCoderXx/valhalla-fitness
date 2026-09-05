import { Text, toneColor } from '~/components'
import { scorePasswordStrength } from '~/domains/account/lib/password-strength'

export function GoogleGIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.29a12 12 0 0 0 0 10.74l3.98-3.09Z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44A11.99 11.99 0 0 0 12 0 12 12 0 0 0 1.29 6.63l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  )
}

/** Sign-up only: a themed bar + label derived from the pure `scorePasswordStrength` scorer. */
export function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = scorePasswordStrength(password)
  const color = toneColor(strength.tone)
  return (
    <div className="mt-2 flex items-center gap-3">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full"
        style={{ backgroundColor: 'var(--mantine-color-default-border)' }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${strength.widthPct}%`, backgroundColor: color, transition: 'width 160ms ease' }}
        />
      </div>
      <Text component="span" size="xs" fw={700} ta="right" tone={strength.tone} style={{ width: '4.5rem' }}>
        {strength.label}
      </Text>
    </div>
  )
}
