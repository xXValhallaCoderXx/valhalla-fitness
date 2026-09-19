import { useState } from 'react'
import { buildBodyLoadTrace } from '~/domains/history/lib/body-load-trace'
import { bodyLoadWindowLabel } from '~/domains/history/lib/body-load'
import {
  ADEQUACY_HIGH_SETS,
  buildRegionAdequacy,
  buildRegionDeltas,
} from '~/domains/history/lib/muscle-volume'
import { bodyLoadLabel } from '~/domains/history/lib/insight-labels'
import type { BodyRegionId, HistoryDashboardWithInsights, InsightGating } from '~/domains/history'
import { useExperienceMode } from '~/domains/account/components'
import { InspectorLayout } from '~/components'
import { formatCompactDate } from '~/shared/lib/dates'
import { BodyLoadMapPanel, type BodyMapView } from '../body-load/BodyLoadMapPanel'
import { BodyLoadRegionTable } from '../body-load/BodyLoadRegionTable'
import { BodyLoadTracePanel } from '../inspector/BodyLoadTracePanel'
import { InsightTabHeader } from '../insights/InsightTabHeader'
import { adequacyFill, bodyLoadFill } from '../body-load/body-load-style'

/**
 * Which muscles the programme is actually working.
 *
 * Deliberately no range switch: both views run on windows fixed server-side — seven days of
 * recency-weighted load, four weeks of weekly sets — so the window is stated as a chip rather than
 * offered as a control that would not change anything.
 */
export function BodyLoadTab({ data, gating }: { data: HistoryDashboardWithInsights; gating: InsightGating }) {
  const { mode, isFull, showFormulas } = useExperienceMode()
  const [view, setView] = useState<BodyMapView>('fatigue')
  const [selectedRegionId, setSelectedRegionId] = useState<BodyRegionId | null>(null)

  const fatigueRegions = data.bodyLoad.regions
    .filter((region) => region.impactPercent > 0)
    .sort((left, right) => right.impactPercent - left.impactPercent)
  const adequacy = buildRegionAdequacy(data.insights.weeklyRegionSets, data.insights.today)
  // The 10–20 colouring is misleading on a near-empty history — hold it back until the window has
  // enough sets (mirrors the muscle-balance card's gate).
  const setsGated = adequacy.insufficient || gating.lifecycle === 'empty' || gating.lifecycle === 'cold_start'

  // Calendar-anchored and deload-aware; `reason` says why there is no comparison when there isn't.
  const weekChange = buildRegionDeltas(data.insights.weeklyRegionSets, data.insights.today, {
    suppress: gating.suppressWeekComparison,
  })
  const deltaById = new Map(weekChange.deltas.map((delta) => [delta.regionId, delta]))
  const showDelta = weekChange.reason === 'ok'

  const fatigueById = new Map(data.bodyLoad.regions.map((region) => [region.regionId, region]))
  const adequacyById = new Map(adequacy.regions.map((region) => [region.regionId, region]))

  // Colour names the tier; opacity carries "more work → darker", which is what the ramp legend
  // beneath the map is describing.
  const styleFor = (regionId: BodyRegionId) => {
    if (view === 'fatigue') {
      const region = fatigueById.get(regionId)
      return {
        fill: bodyLoadFill(region?.tier ?? 'fresh'),
        opacity: 0.35 + ((region?.impactPercent ?? 0) / 100) * 0.65,
      }
    }
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

  const sessionCount = data.bodyLoad.regions.length ? data.overview.completedSessions : 0

  return (
    <div>
      <InsightTabHeader
        title={bodyLoadLabel('screenTitle', mode)}
        subtitle={
          view === 'fatigue'
            ? `${bodyLoadLabel('subtitleMetric', mode)} · ${bodyLoadWindowLabel(data.bodyLoad)}`
            // Not "sets per week" — that is the row heading's wording, and two elements matching
            // the same phrase is a locator collision waiting to happen.
            : `${bodyLoadLabel('setsHeading', mode)} · last ${adequacy.weeks || 4} weeks · ${ADEQUACY_HIGH_SETS} sets is a full week for most muscles`
        }
        note={
          sessionCount
            ? undefined
            : 'Nothing logged in this window yet — the map stays grey rather than guessing.'
        }
      />

      <InspectorLayout
        inspector={
          trace && selectedRegion ? (
            <BodyLoadTracePanel trace={trace} region={selectedRegion} showFormulas={showFormulas} />
          ) : null
        }
      >
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <BodyLoadMapPanel
            view={view}
            onViewChange={setView}
            mode={mode}
            bodyLoad={data.bodyLoad}
            adequacyWeeks={adequacy.weeks}
            gated={setsGated}
            styleFor={styleFor}
          />
          <BodyLoadRegionTable
            view={view}
            mode={mode}
            isFull={isFull}
            fatigueRegions={fatigueRegions}
            adequacyRegions={adequacy.regions}
            deltaById={deltaById}
            showDelta={showDelta}
            gated={setsGated}
            weekNote={weekChangeNote(weekChange.reason, gating, weekChange.weekStart, mode)}
            selectedRegionId={selectedRegionId}
            onSelectRegion={isFull ? setSelectedRegionId : undefined}
          />
        </div>
      </InspectorLayout>
    </div>
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
