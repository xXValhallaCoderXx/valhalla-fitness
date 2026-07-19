import type { ReactNode } from 'react'
import { Panel, SectionLabel, Text } from '~/components'

export function StartInfoMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Panel surface="inset" p="sm">
      <SectionLabel>{label}</SectionLabel>
      <Text mt={4} size="sm" fw={800} truncate>
        {value}
      </Text>
    </Panel>
  )
}
