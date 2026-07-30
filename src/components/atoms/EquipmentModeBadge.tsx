import { Badge, type BadgeProps } from '@mantine/core'

export type EquipmentModeBadgeProps = Omit<BadgeProps, 'children'> & {
  equipmentMode?: 'standard' | 'free_weight' | null
}

/** Read-only programme equipment context. Standard and legacy sessions stay visually quiet. */
export function EquipmentModeBadge({
  equipmentMode,
  size = 'xs',
  variant = 'light',
  color = 'accent',
  ...props
}: EquipmentModeBadgeProps) {
  if (equipmentMode !== 'free_weight') return null

  return (
    <Badge size={size} variant={variant} color={color} {...props}>
      Free weights only
    </Badge>
  )
}
