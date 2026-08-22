import type { ReactNode } from 'react'
import { Panel, SectionLabel, StatValue } from '~/components'

export type OverviewKpi = {
  label: string
  value: ReactNode
  desktopOnly?: boolean
}

export function OverviewKpiStrip({ kpis }: { kpis: OverviewKpi[] }) {
  return (
    <Panel p={0} className="overflow-hidden">
      <div
        className="grid grid-cols-2 gap-px sm:grid-cols-3 lg:grid-cols-5"
        style={{ backgroundColor: 'var(--mantine-color-default-border)' }}
      >
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={kpi.desktopOnly ? 'hidden p-4 lg:block' : 'p-4'}
            style={{ backgroundColor: 'var(--mantine-color-default)' }}
          >
            <SectionLabel>{kpi.label}</SectionLabel>
            <StatValue size="xl" mt={4} truncate>
              {kpi.value}
            </StatValue>
          </div>
        ))}
      </div>
    </Panel>
  )
}
