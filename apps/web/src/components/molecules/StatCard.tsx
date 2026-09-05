import { Box, Group } from '@mantine/core'
import type { ReactNode } from 'react'
import { Caption, StatValue, type Tone } from '~/components/atoms'
import { Panel } from './Panel'

export type StatCardProps = {
  label: ReactNode
  value: ReactNode
  icon?: ReactNode
  tone?: Tone
}

/** Compact metric tile: optional icon, prominent value, dimmed label. */
export function StatCard({ label, value, icon, tone }: StatCardProps) {
  return (
    <Panel surface="inset" p="sm" className="min-w-0">
      <Group justify="space-between" gap="sm" wrap="nowrap">
        {icon ? (
          <Box c="dimmed" className="shrink-0">
            {icon}
          </Box>
        ) : null}
        <StatValue tone={tone} size="md" truncate className="min-w-0 flex-1 text-right">
          {value}
        </StatValue>
      </Group>
      <Caption mt={4} fw={700} tt="uppercase">
        {label}
      </Caption>
    </Panel>
  )
}
