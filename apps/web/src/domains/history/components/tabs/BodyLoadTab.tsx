import { Badge, SegmentedControl } from '@mantine/core'
import { useState } from 'react'
import { bodyLoadExplanation } from '~/domains/history/lib/body-load'
import { buildBodyLoadTrace } from '~/domains/history/lib/body-load-trace'
import {
  ADEQUACY_HIGH_SETS,
  adequacyExplanation,
  buildRegionAdequacy,
  buildRegionDeltas,
} from '~/domains/history/lib/muscle-volume'
import { bodyLoadLabel } from '~/domains/history/lib/insight-labels'
import type { BodyRegionId, HistoryDashboardWithInsights, InsightGating } from '~/domains/history'
import { useExperienceMode } from '~/domains/account/components'
import { Caption, InspectorLayout, Panel, SectionLabel, Text } from '~/components'
import { formatCompactDate } from '~/shared/lib/dates'
import { LoadTracePanel } from '~/domains/program/components/inspector/LoadTracePanel'
import { AdequacyRow, FatigueRow } from '../body-load/BodyLoadRows'
import { BodyLoadLegend } from '../body-load/BodyLoadLegend'
import { BodyLoadMap } from '../body-load/BodyLoadMap'
import { adequacyFill, bodyLoadFill } from '../body-load/body-load-style'

type BodyMapView = 'fatigue' | 'sets'

export function BodyLoadTab({ data, gating }: { data: HistoryDashboardWithInsights; gating: InsightGating }) {
  const { mode, isFull, showFormulas } = useExperienceMode()
  const [view, setView] = useState<BodyMapView>('fatigue')
  const [selectedRegionId, setSelectedRegionId] = useState<BodyRegionId | null>(null)

  const fatigueRegions = data.bodyLoad.regions
    .filter((region) => region.impactPercent > 0)
    .sort((left, right) => right.impactPercent - left.impactPercent)
  const adequacy = buildRegionAdequacy(data.insights.weeklyRegionSets, data.insights.today)
  // The 10–20 coloring is misleading on a near-empty history — hold it back
  // until the window has enough sets (mirrors the muscle-balance card's gate).
  const setsGated = adequacy.insufficient || gating.lifecycle === 'empty' || gating.lifecycle === 'cold_start'

  // Calendar-anchored and deload-aware; `reason` says why there is no comparison when there isn't.
  const weekChange = buildRegionDeltas(data.insights.weeklyRegionSets, data.insights.today, {
    suppress: gating.suppressWeekComparison,
  })
  const deltaById = new Map(weekChange.deltas.map((entry) => [entry.regionId, entry]))
  const showDelta = weekChange.reason === 'ok'

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

  const selectedRegion =
    isFull && view === 'fatigue' ? fatigueById.get(selectedRegionId as BodyRegionId) ?? null : null
  const trace = selectedRegion
    ? buildBodyLoadTrace({ region: selectedRegion, windowDays: data.bodyLoad.windowDays })
    : null

  const mapPanel = (
    <Panel p="md">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionLabel>
            {bodyLoadLabel(view === 'fatigue' ? 'fatigueHeading' : 'setsHeading', mode)}
          </SectionLabel>
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
          { value: 'fatigue', label: bodyLoadLabel('fatigueToggle', mode) },
          { value: 'sets', label: bodyLoadLabel('setsToggle', mode) },
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
          <BodyLoadLegend view={view} />
        </>
      )}
    </Panel>
  )

  const listPanel = (
    <Panel p="md">
      {view === 'fatigue' ? (
        <>
          <SectionLabel>{bodyLoadLabel('fatigueRows', mode)}</SectionLabel>
          <Caption mt={4}>{bodyLoadExplanation}</Caption>
          {isFull ? <Caption mt={1}>Pick a muscle to see how its number was built.</Caption> : null}
          <div className="mt-2 flex flex-col">
            {fatigueRegions.length ? (
              fatigueRegions.map((region) => (
                <FatigueRow
                  key={region.regionId}
                  region={region}
                  onSelect={isFull ? setSelectedRegionId : undefined}
                  selected={region.regionId === selectedRegionId}
                />
              ))
            ) : (
              <Text size="sm" tone="dimmed" mt="sm">No completed sets in the recent window.</Text>
            )}
          </div>
        </>
      ) : (
        <>
          <SectionLabel>{bodyLoadLabel('setsRows', mode)}</SectionLabel>
          <Caption mt={4}>{adequacyExplanation}</Caption>
          {!setsGated ? (
            <Caption mt={1}>{weekChangeNote(weekChange.reason, gating, weekChange.weekStart, mode)}</Caption>
          ) : null}
          <div className="mt-2 flex flex-col">
            {setsGated ? (
              <Text size="sm" tone="dimmed" mt="sm">Not enough recent sets to judge weekly volume fairly yet.</Text>
            ) : (
              adequacy.regions.map((region) => (
                <AdequacyRow
                  key={region.regionId}
                  region={region}
                  delta={deltaById.get(region.regionId)}
                  showDelta={showDelta}
                />
              ))
            )}
          </div>
        </>
      )}
    </Panel>
  )

  return (
    <InspectorLayout
      inspector={trace ? <LoadTracePanel trace={trace} showFormulas={showFormulas} /> : null}
    >
      {/* Map beside the list only while no trace is open: with the 20rem inspector rail out, a
          third column squeezes the list until its percentages clip. When the rail is open the
          list leads instead — it is what was just clicked, and burying it under a full-width
          figure would scroll the selected row off screen. */}
      <div
        className={`grid grid-cols-1 items-start gap-4 ${
          trace ? '' : 'lg:grid-cols-[24rem_minmax(0,1fr)]'
        }`}
      >
        {trace ? (
          <>
            {listPanel}
            {mapPanel}
          </>
        ) : (
          <>
            {mapPanel}
            {listPanel}
          </>
        )}
      </div>
    </InspectorLayout>
  )
}

/**
 * A missing comparison always says why.
 *
 * The alternative — a column of dashes — reads as "no change", which during a deload is the exact
 * opposite of the truth.
 */
function weekChangeNote(
  reason: ReturnType<typeof buildRegionDeltas>['reason'],
  gating: InsightGating,
  weekStart: string,
  mode: Parameters<typeof bodyLoadLabel>[1],
) {
  if (reason === 'ok') {
    return `${bodyLoadLabel('weekChange', mode)} · week of ${formatCompactDate(weekStart) ?? weekStart}`
  }
  if (reason === 'no_prior_week') return 'No completed week before this one to compare against yet.'
  if (gating.deloadWeek) return 'No week-on-week comparison during a deload — the drop is planned.'
  if (gating.planState === 'active_week1') return 'First week of this programme — nothing to compare against yet.'
  return 'Not enough training history for a fair week-on-week comparison yet.'
}
