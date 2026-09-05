import { Repeat2 } from 'lucide-react'
import type { MovementSlot } from '~/domains/session'
import { ToolButton } from './LiveSessionControls'
import { getMovementSwapControl } from './live-session-utils'

export function MovementSwapToolButton({
  movement,
  disabled,
  onClick,
}: {
  movement: MovementSlot
  disabled: boolean
  onClick: () => void
}) {
  const control = getMovementSwapControl(movement)
  return (
    <ToolButton
      title={control.title}
      icon={<Repeat2 size={13} />}
      label="Swap"
      disabled={control.disabled || disabled}
      onClick={onClick}
    />
  )
}
