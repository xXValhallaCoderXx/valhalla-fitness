import { ActionIcon, Tooltip } from '@mantine/core'
import { Info } from 'lucide-react'

/**
 * Small ⓘ that reveals a short explanation on hover/focus — and on touch, so it
 * stays usable in the gym. Used for "About this metric" blurbs on insight cards
 * and detail reveals in the logger.
 */
export function InfoHint({ label, children, width = 280 }: { label: string; children: string; width?: number }) {
  return (
    <Tooltip
      label={children}
      multiline
      withArrow
      withinPortal
      position="top"
      w={width}
      events={{ hover: true, focus: true, touch: true }}
    >
      <ActionIcon aria-label={label} size="sm" radius="xl" variant="subtle" color="neutral">
        <Info size={13} />
      </ActionIcon>
    </Tooltip>
  )
}
