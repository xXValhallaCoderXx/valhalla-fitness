import { Caption, Text } from '~/components'
import { RIR_OPTIONS } from './live-session-utils'

/** Large reps-in-reserve picker (0/1/2/3+) for focus mode. Shares RIR_OPTIONS with the overview. */
export function FocusRirRow({
  value,
  onChange,
  disabled = false,
}: {
  value?: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  return (
    <div>
      <Caption component="div">
        <Text component="span" fw={700} c="inherit">
          Reps in reserve
        </Text>{' '}
        · could you do more?
      </Caption>
      <div className="mt-2 grid grid-cols-4 gap-2" role="group" aria-label="Reps in reserve (RIR)" data-tour="focus-rir">
        {RIR_OPTIONS.map((option) => {
          // The 3+ bucket also reflects any legacy values logged above 3.
          const selected = option.value === 3 ? (value ?? -1) >= 3 : value === option.value
          return (
            <button
              key={option.value}
              type="button"
              title={option.hint}
              aria-label={option.hint}
              aria-pressed={selected}
              disabled={disabled}
              className="rounded-2xl border py-3 text-center transition active:scale-95"
              style={{
                borderColor: selected ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-default-border)',
                backgroundColor: selected ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-default)',
                color: selected ? 'white' : 'var(--mantine-color-text)',
                fontWeight: 800,
              }}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
