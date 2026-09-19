import { UnstyledButton } from '@mantine/core'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Caption, Text } from '~/components'
import { useExperienceMode } from '~/domains/account/components'
import { equipmentModeLabel } from '@sheetless/domain/program/equipment-mode-labels'
import type { ProgramInstance } from '~/domains/program'

/** The page's closing rule: the cycle link, and the settings that shaped every number above. */
export function ProgramFooterRule({
  program,
  cycleOpen,
  onToggleCycle,
}: {
  program: ProgramInstance
  cycleOpen: boolean
  onToggleCycle: () => void
}) {
  const { isFull } = useExperienceMode()
  // The period's own status is the honest read-out; `returnStage` answers a different question
  // (which stage of the ramp you are on) and needs an active period to mean anything.
  const returnLabel = program.returnPeriod?.status ?? 'none'

  return (
    <div
      className="mt-2 flex flex-wrap items-center gap-x-8 gap-y-2 pt-4"
      style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
      data-testid="program-footer"
    >
      <UnstyledButton onClick={onToggleCycle} className="flex items-center gap-1.5">
        <Text component="span" size="sm" fw={700} tone="action">
          {cycleOpen ? 'Hide full cycle' : 'View full cycle'}
        </Text>
        {cycleOpen ? (
          <ChevronUp size={15} color="var(--vf-action-text)" />
        ) : (
          <ChevronDown size={15} color="var(--vf-action-text)" />
        )}
      </UnstyledButton>

      <Caption>Equipment: {equipmentModeLabel(program.equipmentMode)}</Caption>
      <Caption>Return period: {returnLabel}</Caption>

      {isFull ? (
        <Caption style={{ fontVariantNumeric: 'tabular-nums' }}>
          Overrides: {program.loadOverrides?.length ?? 0} · Adjustments: {program.loadAdjustments?.length ?? 0}
        </Caption>
      ) : null}
    </div>
  )
}
