import { getMovementName } from '@sheetless/domain/movement/movements'
import { resolveProgramMovementOverride } from '@sheetless/domain/program/equipment-mode'
import type { ProgramInstance } from '@sheetless/domain/program/types'

/** Collapse repeated phase-slot choices into the movement replacements shown on Plan. */
export function currentEquipmentSwaps(program: ProgramInstance) {
  if (program.equipmentMode !== 'free_weight') return []
  const seen = new Set<string>()
  return (program.equipmentModeChoices ?? []).flatMap((choice) => {
    const effectiveSource = resolveProgramMovementOverride(program.movementOverrides ?? [], {
      slotId: choice.slotId,
      phaseKey: choice.phaseKey,
      role: choice.role,
      movementId: choice.sourceMovementId,
      currentWeekIndex: Number.MAX_SAFE_INTEGER,
    })
    if (effectiveSource !== choice.sourceMovementId) return []
    const key = `${choice.sourceMovementId}:${choice.replacementMovementId}`
    if (seen.has(key)) return []
    seen.add(key)
    return [{
      key,
      sourceName: getMovementName(choice.sourceMovementId),
      replacementName: getMovementName(choice.replacementMovementId),
    }]
  })
}
