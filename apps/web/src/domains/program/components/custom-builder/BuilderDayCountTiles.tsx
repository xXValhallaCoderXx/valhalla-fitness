import { useState } from 'react'
import { Caption, SectionLabel, Text } from '~/components'
import { ProgramInfoHint } from '~/domains/program/components/ProgramInfoHint'
import { recommendedDaysFor } from '~/domains/program/lib/custom-builder-guidance'
import type { CustomProgramMethodology } from '~/domains/program/lib/custom-program-meta'

const MAX_DAYS = 7
/** Above this the row folds into one tile — 6 and 7 day weeks are rare enough to be a second click. */
const COLLAPSE_ABOVE = 4

/**
 * How many days a week you can train, as tiles.
 *
 * The comp draws `2 3 4 5+`, but `clampBuilderDayCount` spans 1–7 and `simple_linear` allows a
 * single day — a fixed four-tile row would make some methodologies unconfigurable. So the low end
 * comes from the methodology's own hard minimum, and `5+` expands rather than capping.
 */
export function BuilderDayCountTiles({
  methodology,
  daysPerWeek,
  disabled = false,
  onChange,
}: {
  methodology: CustomProgramMethodology
  daysPerWeek: number
  disabled?: boolean
  onChange: (daysPerWeek: number) => void
}) {
  const recommended = recommendedDaysFor(methodology)
  const [expanded, setExpanded] = useState(daysPerWeek > COLLAPSE_ABOVE)
  const showAll = expanded || daysPerWeek > COLLAPSE_ABOVE
  const last = showAll ? MAX_DAYS : COLLAPSE_ABOVE
  const days = Array.from({ length: last - recommended.hardMin + 1 }, (_, index) => recommended.hardMin + index)

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <SectionLabel>Days a week you can train</SectionLabel>
        <ProgramInfoHint label="Day count guidance">{recommended.rationale}</ProgramInfoHint>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {days.map((day) => (
          <DayTile
            key={day}
            label={String(day)}
            selected={day === daysPerWeek}
            disabled={disabled}
            onClick={() => onChange(day)}
          />
        ))}
        {showAll ? null : (
          <DayTile
            label={`${COLLAPSE_ABOVE + 1}+`}
            selected={false}
            disabled={disabled}
            onClick={() => {
              setExpanded(true)
              onChange(COLLAPSE_ABOVE + 1)
            }}
          />
        )}
        <Caption className="ml-1">Best for this method: {recommended.label}</Caption>
      </div>
    </div>
  )
}

function DayTile({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string
  selected: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label === '1' ? '1 day a week' : `${label} days a week`}
      disabled={disabled}
      onClick={onClick}
      className="flex items-center justify-center"
      style={{
        width: '3rem',
        height: '2.75rem',
        borderRadius: 'var(--mantine-radius-md)',
        border: `1px solid ${selected ? 'var(--vf-action-border)' : 'var(--mantine-color-default-border)'}`,
        background: selected ? 'var(--vf-action-soft)' : 'var(--mantine-color-default)',
        boxShadow: selected ? '0 0 0 1px var(--vf-action-border)' : undefined,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        appearance: 'none',
      }}
    >
      <Text component="span" size="md" fw={800} tone={selected ? 'action' : 'default'}>
        {label}
      </Text>
    </button>
  )
}
