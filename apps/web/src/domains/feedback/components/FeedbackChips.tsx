import { Text } from '~/components'

/**
 * Single-select pill row for feedback answers/reasons/categories. Visuals follow
 * the History filter chips; a11y follows the RIR picker (`role="group"` + `aria-pressed`).
 */
export function FeedbackChipGroup<T extends string>({
  options,
  value,
  onChange,
  label,
  disabled = false,
}: {
  options: ReadonlyArray<{ value: T; label: string }>
  value: T | null
  onChange: (value: T) => void
  label: string
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className="rounded-full px-3 py-1.5 transition active:scale-95"
            style={{
              whiteSpace: 'nowrap',
              backgroundColor: active ? 'var(--vf-action-soft)' : 'var(--vf-surface-2)',
              border: `1px solid ${active ? 'var(--vf-action-border)' : 'var(--mantine-color-default-border)'}`,
              cursor: disabled ? 'default' : 'pointer',
            }}
          >
            <Text component="span" size="xs" fw={700} c={active ? 'var(--vf-action-text)' : 'var(--mantine-color-dimmed)'}>
              {option.label}
            </Text>
          </button>
        )
      })}
    </div>
  )
}
