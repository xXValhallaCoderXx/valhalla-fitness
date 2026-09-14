import type { ProgramEquipmentMode } from '@sheetless/domain/program/types'

/**
 * How a programme's equipment policy reads in prose.
 *
 * `EquipmentModeBadge` renders nothing for `standard` because a badge is a flag and the default
 * needs no flagging — but a footer read-out has to name both states, so this does.
 */
export function equipmentModeLabel(mode: ProgramEquipmentMode | null | undefined): string {
  return mode === 'free_weight' ? 'free weights only' : 'all equipment'
}
