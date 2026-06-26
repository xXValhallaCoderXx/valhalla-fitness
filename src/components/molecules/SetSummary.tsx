import type { MantineSize } from '@mantine/core'
import { Caption, Text } from '~/components/atoms'
import { describeLift, type LiftValues } from '~/shared/lib/set-notation'

/**
 * Plain-language set line ("147.5 kg × 7 reps · ~3 left") with the technical
 * shorthand ("RIR 3 · e1RM 196.5 kg") kept quietly beneath it. Pass `values`
 * to derive both lines, or override with explicit `plain`/`technical` strings.
 */
export function SetSummary({
  values,
  plain,
  technical,
  size = 'sm',
  className,
}: {
  values?: LiftValues
  plain?: string
  technical?: string
  size?: MantineSize
  className?: string
}) {
  const derived = values ? describeLift(values) : null
  const primary = plain ?? derived?.plain ?? '—'
  const secondary = technical ?? derived?.technical ?? ''
  return (
    <div className={className}>
      <Text size={size} fw={800}>
        {primary}
      </Text>
      {secondary ? <Caption mt={1}>{secondary}</Caption> : null}
    </div>
  )
}
