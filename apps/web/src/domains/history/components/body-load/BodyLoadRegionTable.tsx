import type { ExperienceMode } from '~/domains/account'
import { bodyLoadCoverageNote, bodyLoadExplanation } from '~/domains/history/lib/body-load'
import { adequacyExplanation, type RegionAdequacy, type RegionDelta } from '~/domains/history/lib/muscle-volume'
import { bodyLoadLabel } from '~/domains/history/lib/insight-labels'
import type { BodyLoadRegion, BodyRegionId } from '~/domains/history'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import { AdequacyRow, FatigueRow } from './BodyLoadRows'
import type { BodyMapView } from './BodyLoadMapPanel'

/**
 * Region by region, most-worked first.
 *
 * Rows stay `<button>`s rather than table rows: each one selects a muscle to trace, and a table
 * whose every row is one large button is worse to navigate than a list of controls.
 */
export function BodyLoadRegionTable({
  view,
  mode,
  isFull,
  fatigueRegions,
  adequacyRegions,
  deltaById,
  showDelta,
  gated,
  weekNote,
  selectedRegionId,
  onSelectRegion,
}: {
  view: BodyMapView
  mode: ExperienceMode
  isFull: boolean
  fatigueRegions: BodyLoadRegion[]
  adequacyRegions: RegionAdequacy[]
  deltaById: Map<BodyRegionId, RegionDelta | undefined>
  showDelta: boolean
  gated: boolean
  /** Why there is no week-on-week comparison, when there isn't one. */
  weekNote: string
  selectedRegionId: BodyRegionId | null
  onSelectRegion?: (regionId: BodyRegionId) => void
}) {
  return (
    <Panel p="md" className="flex flex-col">
      <SectionLabel>{bodyLoadLabel(view === 'fatigue' ? 'fatigueRows' : 'setsRows', mode)}</SectionLabel>
      <Caption mt={4}>{view === 'fatigue' ? bodyLoadExplanation : adequacyExplanation}</Caption>
      {view === 'fatigue' && isFull ? (
        <Caption mt={1}>Pick a muscle to see how its number was built.</Caption>
      ) : null}
      {view === 'sets' && !gated ? <Caption mt={1}>{weekNote}</Caption> : null}

      <div className="mt-2 flex flex-col">
        {view === 'fatigue' ? (
          fatigueRegions.length ? (
            fatigueRegions.map((region) => (
              <FatigueRow
                key={region.regionId}
                region={region}
                onSelect={onSelectRegion}
                selected={region.regionId === selectedRegionId}
              />
            ))
          ) : (
            <Text size="sm" tone="dimmed" mt="sm">No completed sets in the recent window.</Text>
          )
        ) : gated ? (
          <Text size="sm" tone="dimmed" mt="sm">Not enough recent sets to judge weekly volume fairly yet.</Text>
        ) : (
          adequacyRegions.map((region) => (
            <AdequacyRow
              key={region.regionId}
              region={region}
              delta={deltaById.get(region.regionId)}
              showDelta={showDelta}
            />
          ))
        )}
      </div>

      {/* The sentence that stops "nothing logged" being read as "recovered". */}
      <Caption
        component="p"
        mt="auto"
        pt="sm"
        lh={1.5}
        style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
      >
        {bodyLoadCoverageNote(fatigueRegions, mode)}
      </Caption>
    </Panel>
  )
}
