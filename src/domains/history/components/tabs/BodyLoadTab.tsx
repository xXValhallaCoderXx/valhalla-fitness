import { Badge } from '@mantine/core'
import { bodyLoadExplanation, bodyLoadTierLabels } from '~/domains/history/lib/body-load'
import type { BodyLoadRegion, BodyRegionId, HistoryDashboard } from '~/shared/types'
import { Caption, Panel, SectionLabel, StatValue, Text } from '~/components'
import { bodyLoadColor, toneForTier } from '../insight-format'

export function BodyLoadTab({ data }: { data: HistoryDashboard }) {
  const regions = data.bodyLoad.regions
    .filter((region) => region.impactPercent > 0)
    .sort((left, right) => right.impactPercent - left.impactPercent)

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[24rem_minmax(0,1fr)]">
      <Panel p="md">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionLabel>Muscle fatigue</SectionLabel>
            <Text mt={4} size="sm" fw={900}>Last {data.bodyLoad.windowDays} days</Text>
          </div>
          <Badge color="success">{data.bodyLoad.freshRegionCount} of {data.bodyLoad.regions.length} fresh</Badge>
        </div>
        <BodyLoadMap regions={data.bodyLoad.regions} />
        <div className="mt-3 flex flex-wrap justify-center gap-4">
          <LegendSwatch color="var(--vf-danger-text)" label="Worked hard" />
          <LegendSwatch color="var(--vf-action-text)" label="Light" />
          <LegendSwatch color="var(--mantine-color-dimmed)" label="Fresh" />
        </div>
      </Panel>

      <Panel p="md">
        <SectionLabel>Affected regions · most to least</SectionLabel>
        <Caption mt={4}>{bodyLoadExplanation}</Caption>
        <div className="mt-2 flex flex-col">
          {regions.length ? (
            regions.map((region) => <FatigueRow key={region.regionId} region={region} />)
          ) : (
            <Text size="sm" tone="dimmed" mt="sm">No completed sets in the recent window.</Text>
          )}
        </div>
      </Panel>
    </div>
  )
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      <Caption>{label}</Caption>
    </span>
  )
}

function FatigueRow({ region }: { region: BodyLoadRegion }) {
  return (
    <div className="flex items-center gap-4 border-t py-3 first:border-t-0" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
      <div className="w-28 shrink-0 sm:w-40">
        <Text fw={700} truncate>{region.label}</Text>
        <Caption mt={1}>{region.recentSetCount} recent set{region.recentSetCount === 1 ? '' : 's'}</Caption>
      </div>
      <div className="min-w-0 flex-1">
        <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--vf-surface-inset)' }}>
          <div className="h-full rounded-full" style={{ width: `${region.impactPercent}%`, backgroundColor: bodyLoadColor(region.tier) }} />
        </div>
        <Caption mt={1.5} truncate>{region.movementNames.length ? region.movementNames.join(', ') : 'No recent work'}</Caption>
      </div>
      <div className="w-16 shrink-0 text-right">
        <StatValue size="sm" tone={toneForTier(region.tier)}>{region.impactPercent}%</StatValue>
        <Caption size="0.625rem" fw={800} tone={toneForTier(region.tier)}>{bodyLoadTierLabels[region.tier]}</Caption>
      </div>
    </div>
  )
}

function BodyLoadMap({ regions }: { regions: BodyLoadRegion[] }) {
  const byId = new Map(regions.map((region) => [region.regionId, region]))
  const fill = (regionId: BodyRegionId) => bodyLoadFill(byId.get(regionId)?.tier ?? 'fresh')
  const opacity = (regionId: BodyRegionId) => 0.35 + ((byId.get(regionId)?.impactPercent ?? 0) / 100) * 0.65

  return (
    <div className="flex justify-center">
      <svg
        viewBox="0 0 300 420"
        role="img"
        aria-label="Muscle fatigue map"
        className="vf-body-load-map"
      >
        <g stroke="var(--mantine-color-default-border)" strokeWidth="3">
          <circle cx="150" cy="46" r="26" fill="var(--vf-surface-3)" />
          <rect x="118" y="76" width="64" height="34" rx="15" fill={fill('shoulders')} opacity={opacity('shoulders')} />
          <path d="M95 104 C114 86 135 82 150 98 C165 82 186 86 205 104 L196 156 C178 150 162 143 150 130 C138 143 122 150 104 156 Z" fill={fill('chest')} opacity={opacity('chest')} />
          <path d="M119 156 L181 156 L172 237 L128 237 Z" fill={fill('core')} opacity={opacity('core')} />
          <path d="M74 114 C91 122 102 143 103 168 L94 231 C80 229 70 215 72 196 L78 151 C79 137 76 125 74 114 Z" fill={fill('triceps')} opacity={opacity('triceps')} />
          <path d="M226 114 C209 122 198 143 197 168 L206 231 C220 229 230 215 228 196 L222 151 C221 137 224 125 226 114 Z" fill={fill('triceps')} opacity={opacity('triceps')} />
          <path d="M98 238 L143 238 L135 345 C116 343 102 327 100 305 Z" fill={fill('quads')} opacity={opacity('quads')} />
          <path d="M157 238 L202 238 L200 305 C198 327 184 343 165 345 Z" fill={fill('quads')} opacity={opacity('quads')} />
          <path d="M103 344 L137 344 L132 394 C120 397 108 390 106 377 Z" fill={fill('calves')} opacity={opacity('calves')} />
          <path d="M163 344 L197 344 L194 377 C192 390 180 397 168 394 Z" fill={fill('calves')} opacity={opacity('calves')} />
          <path d="M98 109 C119 120 133 129 150 129 C167 129 181 120 202 109 L190 151 C175 166 125 166 110 151 Z" fill={fill('upper_back')} opacity={opacity('upper_back')} transform="translate(0 2)" />
          <path d="M103 238 L143 238 L139 304 L121 329 C107 306 101 276 103 238 Z" fill={fill('glutes')} opacity={opacity('glutes')} transform="translate(0 -2)" />
          <path d="M157 238 L197 238 C199 276 193 306 179 329 L161 304 Z" fill={fill('glutes')} opacity={opacity('glutes')} transform="translate(0 -2)" />
          <path d="M113 251 L137 251 L132 339 C117 329 108 307 109 285 Z" fill={fill('hamstrings')} opacity={opacity('hamstrings')} />
          <path d="M163 251 L187 251 L191 285 C192 307 183 329 168 339 Z" fill={fill('hamstrings')} opacity={opacity('hamstrings')} />
          <path d="M63 177 L92 188 L85 255 C75 263 62 258 61 245 Z" fill={fill('biceps')} opacity={opacity('biceps')} />
          <path d="M237 177 L208 188 L215 255 C225 263 238 258 239 245 Z" fill={fill('biceps')} opacity={opacity('biceps')} />
        </g>
      </svg>
    </div>
  )
}

function bodyLoadFill(tier: BodyLoadRegion['tier']) {
  if (tier === 'high') return 'var(--vf-danger-text)'
  if (tier === 'moderate') return 'var(--vf-warning-text)'
  if (tier === 'low') return 'var(--vf-action-text)'
  return 'var(--mantine-color-dimmed)'
}
