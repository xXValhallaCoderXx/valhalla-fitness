import { Caption, Panel, SectionLabel, Text } from '~/components'
import type { ProgramInstance } from '~/domains/program'
import { ProgramEquipmentModeControl } from './ProgramEquipmentModeControl'
import { ReturnGuideCard } from './return/ReturnGuideCard'

/**
 * Programme settings — everything that shapes the numbers above, in one place.
 *
 * A disclosure panel rather than a modal: `ReturnGuideCard` already owns a `Modal`, and opening it
 * from inside another one means stacked focus traps and z-index fights for no benefit. Toggled by
 * the header's "Programme settings" button, which is what the comp asks for.
 */
export function ProgrammeSettingsPanel({
  program,
  hasActiveSession,
}: {
  program: ProgramInstance
  hasActiveSession: boolean
}) {
  return (
    <Panel p="md" className="mb-4 grid gap-4 lg:grid-cols-3" data-testid="programme-settings">
      <div>
        <ProgramEquipmentModeControl program={program} disabled={hasActiveSession} />
      </div>

      <div>
        <SectionLabel>Rounding</SectionLabel>
        <Text mt={4} size="sm" fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {program.rounding} {program.units}
        </Text>
        <Caption mt={2} lh={1.4}>
          Every planned weight is rounded to this step. Set when the programme started.
        </Caption>
      </div>

      {/* Renders its own Panel and Modal — kept as a sibling, never nested inside another modal. */}
      <ReturnGuideCard program={program} hasActiveSession={hasActiveSession} />
    </Panel>
  )
}
