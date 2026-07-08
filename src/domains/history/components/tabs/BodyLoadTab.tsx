import { Badge, SegmentedControl } from '@mantine/core'
import { useState } from 'react'
import { bodyLoadExplanation, bodyLoadTierLabels } from '~/domains/history/lib/body-load'
import {
  ADEQUACY_HIGH_SETS,
  adequacyExplanation,
  adequacyTierLabels,
  buildRegionAdequacy,
  type AdequacyTier,
  type RegionAdequacy,
} from '~/domains/history/lib/muscle-volume'
import type { BodyLoadRegion, BodyRegionId, HistoryDashboardWithInsights, InsightGating } from '~/shared/types'
import { Caption, Panel, SectionLabel, StatValue, Text } from '~/components'
import { bodyLoadColor, toneForTier } from '../insight-format'

type BodyMapView = 'fatigue' | 'sets'

export function BodyLoadTab({ data, gating }: { data: HistoryDashboardWithInsights; gating: InsightGating }) {
  const [view, setView] = useState<BodyMapView>('fatigue')
  const fatigueRegions = data.bodyLoad.regions
    .filter((region) => region.impactPercent > 0)
    .sort((left, right) => right.impactPercent - left.impactPercent)
  const adequacy = buildRegionAdequacy(data.insights.weeklyRegionSets, data.insights.generatedAt)
  // The 10–20 coloring is misleading on a near-empty history — hold it back
  // until the window has enough sets (mirrors the muscle-balance card's gate).
  const setsGated = adequacy.insufficient || gating.lifecycle === 'empty' || gating.lifecycle === 'cold_start'

  const fatigueById = new Map(data.bodyLoad.regions.map((region) => [region.regionId, region]))
  const adequacyById = new Map(adequacy.regions.map((region) => [region.regionId, region]))
  const fatigueStyle = (regionId: BodyRegionId) => {
    const region = fatigueById.get(regionId)
    return {
      fill: bodyLoadFill(region?.tier ?? 'fresh'),
      opacity: 0.35 + ((region?.impactPercent ?? 0) / 100) * 0.65,
    }
  }
  const adequacyStyle = (regionId: BodyRegionId) => {
    const region = adequacyById.get(regionId)
    return {
      fill: adequacyFill(region?.tier ?? 'below'),
      opacity: 0.35 + Math.min((region?.weeklySets ?? 0) / ADEQUACY_HIGH_SETS, 1) * 0.65,
    }
  }

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[24rem_minmax(0,1fr)]">
      <Panel p="md">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionLabel>{view === 'fatigue' ? 'Muscle fatigue' : 'Weekly sets'}</SectionLabel>
            <Text mt={4} size="sm" fw={900}>
              {view === 'fatigue' ? `Last ${data.bodyLoad.windowDays} days` : `Last ${adequacy.weeks || 4} weeks`}
            </Text>
          </div>
          {view === 'fatigue' ? (
            <Badge color="success">{data.bodyLoad.freshRegionCount} of {data.bodyLoad.regions.length} fresh</Badge>
          ) : null}
        </div>
        <SegmentedControl
          size="xs"
          radius="md"
          fullWidth
          value={view}
          onChange={(next) => setView(next as BodyMapView)}
          data={[
            { value: 'fatigue', label: 'Fatigue' },
            { value: 'sets', label: 'Weekly sets' },
          ]}
          styles={{
            root: { backgroundColor: 'var(--vf-surface-2)', border: '1px solid var(--mantine-color-default-border)' },
            label: { fontWeight: 700 },
          }}
          className="mb-3"
        />
        {view === 'sets' && setsGated ? (
          <Caption component="p" ta="center" className="py-10">
            Your weekly-sets picture appears after about 20 logged sets in the last few weeks. Keep training — it&apos;s
            on its way.
          </Caption>
        ) : (
          <>
            <BodyLoadMap
              ariaLabel={view === 'fatigue' ? 'Muscle fatigue map' : 'Weekly sets per muscle map'}
              styleFor={view === 'fatigue' ? fatigueStyle : adequacyStyle}
            />
            <div className="mt-3 flex flex-wrap justify-center gap-4">
              {view === 'fatigue' ? (
                <>
                  <LegendSwatch color="var(--vf-danger-text)" label="Worked hard" />
                  <LegendSwatch color="var(--vf-action-text)" label="Light" />
                  <LegendSwatch color="var(--mantine-color-dimmed)" label="Fresh" />
                </>
              ) : (
                <>
                  <LegendSwatch color="var(--vf-success-text)" label={adequacyTierLabels.in_range} />
                  <LegendSwatch color="var(--vf-warning-text)" label={adequacyTierLabels.high} />
                  <LegendSwatch color="var(--mantine-color-dimmed)" label={adequacyTierLabels.below} />
                </>
              )}
            </div>
          </>
        )}
      </Panel>

      <Panel p="md">
        {view === 'fatigue' ? (
          <>
            <SectionLabel>Affected regions · most to least</SectionLabel>
            <Caption mt={4}>{bodyLoadExplanation}</Caption>
            <div className="mt-2 flex flex-col">
              {fatigueRegions.length ? (
                fatigueRegions.map((region) => <FatigueRow key={region.regionId} region={region} />)
              ) : (
                <Text size="sm" tone="dimmed" mt="sm">No completed sets in the recent window.</Text>
              )}
            </div>
          </>
        ) : (
          <>
            <SectionLabel>Sets per week · most to least</SectionLabel>
            <Caption mt={4}>{adequacyExplanation}</Caption>
            <div className="mt-2 flex flex-col">
              {setsGated ? (
                <Text size="sm" tone="dimmed" mt="sm">Not enough recent sets to judge weekly volume fairly yet.</Text>
              ) : (
                adequacy.regions.map((region) => <AdequacyRow key={region.regionId} region={region} />)
              )}
            </div>
          </>
        )}
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

function AdequacyRow({ region }: { region: RegionAdequacy }) {
  const barPercent = Math.min((region.weeklySets / ADEQUACY_HIGH_SETS) * 100, 100)
  return (
    <div className="flex items-center gap-4 border-t py-3 first:border-t-0" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
      <div className="w-28 shrink-0 sm:w-40">
        <Text fw={700} truncate>{region.label}</Text>
      </div>
      <div className="min-w-0 flex-1">
        <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--vf-surface-inset)' }}>
          <div className="h-full rounded-full" style={{ width: `${barPercent}%`, backgroundColor: adequacyFill(region.tier) }} />
        </div>
      </div>
      <div className="w-24 shrink-0 text-right">
        <StatValue size="sm" tone={adequacyTone(region.tier)}>{region.weeklySets}</StatValue>
        <Caption size="0.625rem" fw={800} tone={adequacyTone(region.tier)}>{adequacyTierLabels[region.tier]}</Caption>
      </div>
    </div>
  )
}

function BodyLoadMap({
  styleFor,
  ariaLabel,
}: {
  styleFor: (regionId: BodyRegionId) => { fill: string; opacity: number }
  ariaLabel: string
}) {
  const fill = (regionId: BodyRegionId) => styleFor(regionId).fill
  const opacity = (regionId: BodyRegionId) => styleFor(regionId).opacity

  return (
    <div className="flex justify-center">
      <svg
        viewBox="0 0 300 420"
        role="img"
        aria-label={ariaLabel}
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

function adequacyFill(tier: AdequacyTier) {
  if (tier === 'in_range') return 'var(--vf-success-text)'
  if (tier === 'high') return 'var(--vf-warning-text)'
  return 'var(--mantine-color-dimmed)'
}

function adequacyTone(tier: AdequacyTier): 'success' | 'warning' | 'dimmed' {
  if (tier === 'in_range') return 'success'
  if (tier === 'high') return 'warning'
  return 'dimmed'
}
