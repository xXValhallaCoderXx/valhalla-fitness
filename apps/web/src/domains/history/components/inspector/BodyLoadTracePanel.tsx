import type { LoadTrace } from '~/domains/program/lib/load-trace'
import type { BodyLoadRegion } from '~/domains/history'
import { bodyLoadTierNote } from '~/domains/history/lib/body-load'
import { LoadTracePanel } from '~/domains/program/components/inspector/LoadTracePanel'
import { Caption, SectionLabel } from '~/components'

/**
 * Why a muscle reads where it does.
 *
 * The derivation is the shared `LoadTracePanel`; the footer adds the two things only this figure
 * needs — which band the number falls in, and the reminder that the map measures exposure and never
 * infers recovery from an absence.
 */
export function BodyLoadTracePanel({
  trace,
  region,
  showFormulas,
}: {
  trace: LoadTrace
  region: BodyLoadRegion
  showFormulas: boolean
}) {
  return (
    <LoadTracePanel
      trace={trace}
      showFormulas={showFormulas}
      footer={
        <>
          <div>
            <SectionLabel className="mb-1">Tier</SectionLabel>
            <Caption component="p" lh={1.5}>{bodyLoadTierNote(region)}</Caption>
          </div>
          <Caption component="p" lh={1.5}>
            This is exposure, not recovery. Sheetless never infers freshness from missing data — grey
            means &ldquo;nothing logged&rdquo;.
          </Caption>
        </>
      }
    />
  )
}
