import type { MovementSlot, PlannedSession } from '~/domains/session'

export function phaseKeyForSnapshot(snapshot: PlannedSession, movement?: MovementSlot | null) {
  if (movement?.phaseKey) return movement.phaseKey
  const snapshotPhaseKey = snapshot.movements.find((item) => item.phaseKey)?.phaseKey
  if (snapshotPhaseKey) return snapshotPhaseKey
  if (snapshot.templateId === 'old_school_wave_powerbuilding' || snapshot.templateId === 'bromley-bullmastiff') {
    return snapshot.weekLabel.toLowerCase().startsWith('peak') ? 'peak' : 'base'
  }
  return 'cycle'
}
