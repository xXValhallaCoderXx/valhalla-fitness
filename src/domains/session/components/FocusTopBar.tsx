import { ActionIcon, Button, Tooltip } from '@mantine/core'
import { ChevronLeft, Trash2 } from 'lucide-react'
import { Caption, EquipmentModeBadge, Text } from '~/components'
import type { PlannedSession } from '~/domains/session'

/** Focus-mode top bar: ‹ Overview · centre context · Finish. */
export function FocusTopBar({
  onBack,
  centerPrimary,
  centerSecondary,
  equipmentMode,
  finishLabel,
  finishDisabled,
  onFinish,
  discardDisabled,
  onDiscard,
}: {
  onBack: () => void
  centerPrimary: string
  centerSecondary: string
  equipmentMode?: PlannedSession['equipmentMode']
  finishLabel: string
  finishDisabled: boolean
  onFinish: () => void
  discardDisabled: boolean
  onDiscard: () => void
}) {
  return (
    <div
      className="flex items-center justify-between gap-2 border-b px-3 py-2.5"
      style={{ borderColor: 'var(--mantine-color-default-border)' }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to overview"
        data-testid="focus-overview"
        className="-ml-1 flex shrink-0 items-center gap-0.5 rounded-lg px-2 py-1.5 transition"
        style={{ color: 'var(--mantine-color-dimmed)' }}
      >
        <ChevronLeft size={20} />
        <Text component="span" size="sm" fw={700} c="inherit">
          Overview
        </Text>
      </button>

      <div className="min-w-0 text-center">
        <Text component="div" size="sm" fw={900} truncate>
          {centerPrimary}
        </Text>
        <Caption component="div" size="0.625rem">
          {centerSecondary}
        </Caption>
        <EquipmentModeBadge equipmentMode={equipmentMode} mt={3} />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Tooltip label="Discard workout">
          <ActionIcon
            type="button"
            aria-label="Discard workout"
            variant="subtle"
            color="danger"
            size="sm"
            disabled={discardDisabled}
            onClick={onDiscard}
          >
            <Trash2 size={15} />
          </ActionIcon>
        </Tooltip>
        <Button
          variant="subtle"
          color="action"
          size="compact-sm"
          disabled={finishDisabled}
          onClick={onFinish}
          data-testid="focus-finish"
        >
          {finishLabel}
        </Button>
      </div>
    </div>
  )
}
