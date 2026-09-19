import { Badge, SegmentedControl } from '@mantine/core'
import { Clock } from 'lucide-react'
import type { ExperienceMode } from '~/domains/account'
import { bodyLoadLabel } from '~/domains/history/lib/insight-labels'
import type { BodyLoadSummary, BodyRegionId } from '~/domains/history'
import { Caption, Panel, SectionLabel } from '~/components'
import { BodyLoadLegend } from './BodyLoadLegend'
import { BodyLoadMap } from './BodyLoadMap'

export type BodyMapView = 'fatigue' | 'sets'

/**
 * The silhouette, its ramp legend, and the control that switches what it is shading.
 *
 * The window is a static chip, not a picker: exactly one window exists per view and it is fixed
 * server-side, so a dropdown would be a control with one option.
 */
export function BodyLoadMapPanel({
  view,
  onViewChange,
  mode,
  bodyLoad,
  adequacyWeeks,
  gated,
  styleFor,
}: {
  view: BodyMapView
  onViewChange: (view: BodyMapView) => void
  mode: ExperienceMode
  bodyLoad: BodyLoadSummary
  adequacyWeeks: number
  /** Too little data for the sets view to shade honestly. */
  gated: boolean
  styleFor: (regionId: BodyRegionId) => { fill: string; opacity: number }
}) {
  return (
    <Panel p="md" className="flex flex-col">
      <SectionLabel>{bodyLoadLabel(view === 'fatigue' ? 'fatigueHeading' : 'setsHeading', mode)}</SectionLabel>

      <div className="mb-3 mt-2 flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          size="xs"
          radius="md"
          value={view}
          onChange={(next) => onViewChange(next as BodyMapView)}
          data={[
            { value: 'fatigue', label: bodyLoadLabel('fatigueToggle', mode) },
            { value: 'sets', label: bodyLoadLabel('setsToggle', mode) },
          ]}
          styles={{
            root: { backgroundColor: 'var(--vf-surface-2)', border: '1px solid var(--mantine-color-default-border)' },
            label: { fontWeight: 700 },
          }}
        />
        <span className="flex items-center gap-1.5">
          <Clock size={13} color="var(--mantine-color-dimmed)" className="shrink-0" />
          <Caption fw={700}>
            {view === 'fatigue' ? `Last ${bodyLoad.windowDays} days` : `Last ${adequacyWeeks || 4} weeks`}
          </Caption>
        </span>
      </div>

      {view === 'fatigue' ? (
        <div className="mb-2 flex justify-end">
          <Badge color="success" variant="light" size="xs">
            {bodyLoad.freshRegionCount} of {bodyLoad.regions.length} fresh
          </Badge>
        </div>
      ) : null}

      {view === 'sets' && gated ? (
        <Caption component="p" ta="center" className="py-10">
          Your weekly-sets picture appears after about 20 logged sets in the last few weeks. Keep training — it&apos;s
          on its way.
        </Caption>
      ) : (
        <>
          <BodyLoadMap
            ariaLabel={view === 'fatigue' ? 'Muscle fatigue map' : 'Weekly sets per muscle map'}
            styleFor={styleFor}
          />
          {/* Pinned to the bottom so the legend lines up with the table's footnote beside it. */}
          <div className="mt-auto pt-3">
            <SectionLabel className="mb-2">Scale</SectionLabel>
            <BodyLoadLegend view={view} />
          </div>
        </>
      )}
    </Panel>
  )
}
