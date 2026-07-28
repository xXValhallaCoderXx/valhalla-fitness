import { Button, Popover } from '@mantine/core'
import { Settings } from 'lucide-react'
import type { ReactNode } from 'react'
import { Caption, Text } from '~/components'
import { getMovementName } from '~/domains/movement/lib/movements'
import { programmeValueLabel } from '~/domains/program/lib/template-start-utils'
import type { ProgramStateInput } from '~/domains/program'

/**
 * Tap-friendly explanation for controls that stay disabled until strength estimates exist.
 * Disabled buttons swallow pointer events, so the child must set `pointerEvents: 'none'`
 * and the wrapping span becomes the Popover target that receives the tap.
 */
export function MissingEstimatesPopover({
  active,
  fullWidth = false,
  className,
  children,
}: {
  active: boolean
  fullWidth?: boolean
  className?: string
  children: ReactNode
}) {
  if (!active) return <>{children}</>

  return (
    <Popover withArrow withinPortal position="top" width={280} shadow="md">
      <Popover.Target>
        <span className={`${fullWidth ? 'block w-full' : 'inline-flex'} ${className ?? ''}`.trim()}>
          {children}
        </span>
      </Popover.Target>
      <Popover.Dropdown>
        <div className="space-y-3">
          <Caption>
            Set your estimated 1RMs in <StrengthEstimatesLink /> first. Sheetless uses them to suggest this
            programme&apos;s starting values.
          </Caption>
          <Button component="a" href="/settings#programme-loads" size="xs" className="w-full">
            <Settings size={14} />
            Open Strength Estimates
          </Button>
        </div>
      </Popover.Dropdown>
    </Popover>
  )
}

export function SetupValuesButton({
  className,
  disabled,
  fullWidth = false,
  label,
  onClick,
}: {
  className?: string
  disabled: boolean
  fullWidth?: boolean
  label: string
  onClick: () => void
}) {
  const buttonClassName = `${fullWidth ? 'w-full' : ''} ${disabled ? '' : className ?? ''}`.trim() || undefined
  const button = (
    <Button
      variant="default"
      className={buttonClassName}
      disabled={disabled}
      style={disabled ? { pointerEvents: 'none' } : undefined}
      onClick={disabled ? undefined : onClick}
    >
      <Settings size={14} />
      {label}
    </Button>
  )

  if (!disabled) return button

  return (
    <MissingEstimatesPopover active fullWidth={fullWidth} className={className}>
      {button}
    </MissingEstimatesPopover>
  )
}

export function MissingStrengthEstimatesNotice({
  stateValues,
  size = 'xs',
}: {
  stateValues: ProgramStateInput[]
  size?: string
}) {
  const labels = stateValues.map((state) => getMovementName(state.movementId))
  const programmeValue = programmeValueLabel(stateValues)

  return (
    <Text
      size={size}
      style={{
        border: '1px solid var(--vf-warning-border)',
        backgroundColor: 'var(--vf-warning-soft)',
        color: 'var(--vf-warning-text)',
        borderRadius: 'var(--mantine-radius-md)',
        padding: 'var(--mantine-spacing-sm)',
      }}
    >
      Add {stateValues.length} strength estimate{stateValues.length === 1 ? '' : 's'}
      {labels.length ? <> for {labels.join(', ')}</> : null} in <StrengthEstimatesLink /> before starting.
      Sheetless uses them to suggest this programme&apos;s {programmeValue}.
    </Text>
  )
}

function StrengthEstimatesLink({ children = 'Settings > Strength Estimates' }: { children?: ReactNode }) {
  return (
    <a
      href="/settings#programme-loads"
      style={{
        color: 'var(--vf-action-text)',
        fontWeight: 800,
        textDecoration: 'underline',
        textUnderlineOffset: 2,
      }}
    >
      {children}
    </a>
  )
}
