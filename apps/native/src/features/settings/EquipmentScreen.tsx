import type { Href } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { Button, Caption, Panel, SectionLabel } from '@/components'
import { todayQueryOptions } from '@/features/session/queries'
import { spacing } from '@/lib/tokens'
import { SettingsEditor } from './SettingsEditor'
import { EquipmentSection } from './preferences/EquipmentSection'

export function EquipmentScreen() {
  return <SettingsEditor title="Equipment you own" section="equipment">
    {({ profile, user, draft, disabled, navigate }) => <>
      <EquipmentSection equipmentProfile={draft.values.equipmentProfile}
        disabled={disabled} onToggle={draft.toggleEquipment} />
      <EquipmentContext user={user} timeZone={profile.timezone ?? undefined} disabled={disabled} navigate={navigate} />
    </>}
  </SettingsEditor>
}

function EquipmentContext({ user, timeZone, disabled, navigate }: {
  user: User
  timeZone?: string
  disabled: boolean
  navigate: (href: Href) => void
}) {
  const today = useQuery(todayQueryOptions(user, timeZone))
  return <Panel surface="inset" style={{ gap: spacing.sm, padding: spacing.md }}>
    <SectionLabel>Separate from your plan</SectionLabel>
    <Caption>Your plan's equipment controls what that plan may prescribe. Swapping an exercise during a workout changes that exercise. This page only describes the equipment available to you.</Caption>
    {today.data?.activeProgram ? <Button label="Open this plan’s equipment" variant="subtle"
      disabled={disabled} onPress={() => navigate('/program/equipment')} /> : null}
  </Panel>
}
