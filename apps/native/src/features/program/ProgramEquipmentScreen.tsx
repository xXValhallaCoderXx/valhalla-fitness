import { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { usePreventRemove } from 'expo-router/react-navigation'
import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { ProgramInstance, ProgramEquipmentMode } from '@sheetless/domain/program/types'
import { Button, Heading, Panel, Text } from '@/components'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { PlanLayout } from './overview/PlanLayout'
import { programOverviewQueryOptions } from './queries'
import { CurrentEquipmentSwaps } from './equipment/CurrentEquipmentSwaps'
import { EquipmentModeOptions } from './equipment/EquipmentModeOptions'
import { EquipmentModeReviewSheet } from './equipment/EquipmentModeReviewSheet'
import { useProgramEquipmentMode } from './equipment/useProgramEquipmentMode'

export function ProgramEquipmentScreen() {
  const { user } = useSession()
  const overview = useQuery({ ...programOverviewQueryOptions(user!), enabled: Boolean(user) })
  const back = () => router.back()
  if (!user || overview.isPending) return <PlanLayout backLabel="Plan settings" onBack={back}>
    <Text tone="dimmed">Loading this plan’s equipment…</Text>
  </PlanLayout>
  if (overview.isError) return <PlanLayout backLabel="Plan settings" onBack={back}>
    <Heading order={2}>Equipment could not load</Heading>
    <Text tone="dimmed">{overview.error.message}</Text>
    <Button label="Retry" loading={overview.isFetching} onPress={() => void overview.refetch()} />
  </PlanLayout>
  const program = overview.data.activeProgram
  if (!program) return <PlanLayout backLabel="Plan" onBack={back}>
    <Heading order={2}>No active plan</Heading>
    <Text tone="dimmed">Choose a plan before setting its equipment.</Text>
    <Button label="Browse programmes" onPress={() => router.navigate('/templates')} />
  </PlanLayout>
  return <EquipmentEditor key={`${user.id}:${program.id}`} program={program} user={user}
    hasActiveSession={overview.data.hasActiveSession} />
}

function EquipmentEditor({ program, user, hasActiveSession }: {
  program: ProgramInstance
  user: User
  hasActiveSession: boolean
}) {
  const [draftMode, setDraftMode] = useState<ProgramEquipmentMode | null>(null)
  const equipment = useProgramEquipmentMode({ user, program, hasActiveSession, onSaved: () => setDraftMode(null) })
  const selectedMode = draftMode ?? equipment.currentMode
  const pending = equipment.isPreviewing || equipment.isApplying
  usePreventRemove(pending, () => {})
  const back = () => { if (!pending) router.back() }
  const footer = <View style={{ flexDirection: 'row', gap: spacing.xs }}>
    <Button label="Cancel" variant="default" disabled={pending} onPress={back} style={{ flex: 1 }} />
    <Button label={equipment.previewError ? 'Retry review' : 'Review changes'}
      loading={equipment.isPreviewing} disabled={pending || hasActiveSession || selectedMode === equipment.currentMode}
      onPress={equipment.requestReview} style={{ flex: 1.4 }} testID="review-plan-equipment" />
  </View>
  return <PlanLayout backLabel="Plan settings" onBack={back} footer={footer}>
    <View style={{ gap: spacing.xs }}>
      <Heading order={1}>This plan’s equipment</Heading>
      <Text tone="dimmed">What {program.title} is allowed to prescribe. Separate from the equipment on your profile, and from swapping a single exercise mid-workout.</Text>
    </View>
    <EquipmentModeOptions value={selectedMode} onChange={setDraftMode} disabled={pending || hasActiveSession} />
    <CurrentEquipmentSwaps program={program} />
    <Panel surface="inset" style={{ padding: spacing.md, gap: spacing.xs }}>
      <Text size="sm" tone="dimmed">Changing this affects every future week of this plan. Anything you swapped by hand stays as you set it.</Text>
      <Button variant="subtle" size="sm" label="Equipment I own, in Settings ›"
        disabled={pending} style={{ paddingHorizontal: 0 }} onPress={() => router.push('/settings')} />
    </Panel>
    {hasActiveSession ? <Text size="sm" tone="warning">Finish or discard the current workout before changing this.</Text> : null}
    {equipment.previewError ? <Text size="sm" tone="danger">{equipment.previewError}</Text> : null}
    {equipment.successMessage ? <Text size="sm" tone="success">{equipment.successMessage}</Text> : null}
    <EquipmentModeReviewSheet open={Boolean(equipment.preview)} context="plan"
      targetMode={equipment.preview?.targetMode ?? equipment.targetMode}
      rows={equipment.reviewRows} choices={equipment.choices} unresolved={equipment.unresolved}
      unresolvedCount={equipment.preview?.unresolved.length ?? 0}
      canApply={Boolean(equipment.preview?.canApply) && !hasActiveSession} isPending={pending}
      error={hasActiveSession ? 'Finish or discard the current workout before changing equipment mode.' : equipment.applyError}
      onChoiceChange={equipment.updateChoice} onClose={equipment.closeReview} onConfirm={equipment.apply} />
  </PlanLayout>
}
