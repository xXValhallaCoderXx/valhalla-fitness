import { ActionIcon, Tooltip } from '@mantine/core'
import { Info } from 'lucide-react'

export function ProgramInfoHint({ label, children }: { label: string; children: string }) {
  return (
    <Tooltip label={children} multiline withArrow withinPortal position="top" w={280}>
      <ActionIcon aria-label={label} size="sm" radius="xl" variant="subtle" color="neutral">
        <Info size={12} />
      </ActionIcon>
    </Tooltip>
  )
}
