import { useEffect, useMemo, useState } from 'react'
import { router, useNavigation } from 'expo-router'
import { usePreventRemove, type NavigationAction } from 'expo-router/react-navigation'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@sheetless/domain/account/types'
import type {
  ProgramSetupOptions,
  ProgramTemplateSummary,
} from '@sheetless/domain/program/types'
import { deriveTemplatePhases } from '@sheetless/domain/program/template-start-phases'
import type { TodayPayload } from '@sheetless/domain/session/types'
import { ConfirmDialog, PageHeader, Screen, SegmentedControl, Text } from '@/components'
import { ProgramStartCard } from './ProgramStartCard'
import { ProgramVariantSelector } from './ProgramVariantSelector'
import { TemplateEquipmentModeCard } from './TemplateEquipmentModeCard'
import { TemplateFacts } from './TemplateDetails'
import { TemplateSetupPreview } from './TemplateSetupPreview'
import {
  TemplateStartSetupSheets,
  type TemplateSwapTarget,
} from './TemplateStartSetupSheets'
import { useProgramStart } from './useProgramStart'
import { useTemplateStartCustomizations } from './useTemplateStartCustomizations'

export function TemplateStartSetup({
  user,
  profile,
  today,
  template,
  setup,
  familyMembers,
  reloadPending,
  reloadError,
  onReloadSetup,
}: {
  user: User
  profile: UserProfile
  today: TodayPayload
  template: ProgramTemplateSummary
  setup: ProgramSetupOptions
  familyMembers: ProgramTemplateSummary[]
  reloadPending: boolean
  reloadError: string | null
  onReloadSetup: () => Promise<boolean>
}) {
  const navigation = useNavigation()
  const [weekIndex, setWeekIndex] = useState(0)
  const [swapTarget, setSwapTarget] = useState<TemplateSwapTarget | null>(null)
  const [selectedSwapId, setSelectedSwapId] = useState<string | null>(null)
  const [accessorySession, setAccessorySession] = useState<ProgramSetupOptions['sessions'][number] | null>(null)
  const [blockedAction, setBlockedAction] = useState<NavigationAction | null>(null)
  const [bypassRemoval, setBypassRemoval] = useState(false)
  const [startComplete, setStartComplete] = useState(false)
  const [reloadConfirmOpen, setReloadConfirmOpen] = useState(false)
  const customizations = useTemplateStartCustomizations(setup)
  const phases = useMemo(() => deriveTemplatePhases(setup.previewWeeks), [setup.previewWeeks])
  const selectedWeek = setup.previewWeeks.find((week) => week.index === weekIndex)
    ?? setup.previewWeeks[0]
  const start = useProgramStart({
    user,
    profile,
    today,
    template,
    movementOverrides: customizations.movementOverrides,
    accessoryAdditions: customizations.additions,
    equipmentMode: customizations.equipmentMode,
    freeWeightPolicy: setup.freeWeightPolicy,
    freeWeightChoices: customizations.freeWeightChoices,
    reviewNeeded: customizations.reviewNeeded,
    onStarted: () => {
      setBypassRemoval(true)
      setStartComplete(true)
    },
  })
  const dirty = start.stateValuesDirty || customizations.dirty
  const busy = start.isPending || reloadPending
  const setupControlsDisabled = busy || start.needsReload

  usePreventRemove((dirty || busy) && !bypassRemoval, ({ data }) => {
    if (busy) return
    setBlockedAction(data.action)
  })

  useEffect(() => {
    if (!bypassRemoval) return
    if (blockedAction) {
      const action = blockedAction
      setBlockedAction(null)
      navigation.dispatch(action)
      return
    }
    if (startComplete) router.dismissTo('/(tabs)')
  }, [blockedAction, bypassRemoval, navigation, startComplete])

  const requestReload = () => {
    if (busy) return
    if (dirty) setReloadConfirmOpen(true)
    else void onReloadSetup()
  }

  const confirmReload = async () => {
    const reloaded = await onReloadSetup()
    if (reloaded) setReloadConfirmOpen(false)
  }

  return (
    <>
      <Screen>
        <PageHeader
          title={template.name}
          eyebrow={template.sourceLabel}
          subtitle={template.description}
        />
        <ProgramVariantSelector
          members={familyMembers}
          selectedTemplateId={template.id}
          disabled={setupControlsDisabled}
          onSelect={(nextTemplateId) =>
            router.replace({ pathname: '/template/[templateId]', params: { templateId: nextTemplateId } })
          }
        />
        <TemplateFacts template={template} setup={setup} phases={phases} />

        <TemplateEquipmentModeCard
          mode={customizations.equipmentMode}
          replacementCount={customizations.freeWeightPreview.changes.length}
          unresolvedCount={customizations.freeWeightPreview.unresolved.length}
          reviewNeeded={customizations.reviewNeeded}
          disabled={setupControlsDisabled}
          onChange={customizations.requestEquipmentMode}
          onReview={() => customizations.setReviewOpen(true)}
        />

        <SegmentedControl
          options={setup.previewWeeks.map((week) => ({
            value: String(week.index),
            label: week.label,
          }))}
          value={String(selectedWeek?.index ?? '')}
          onChange={(index: string) => setWeekIndex(Number(index))}
          disabled={setupControlsDisabled}
          accessibilityLabel="Preview week"
        />

        {selectedWeek ? (
          <TemplateSetupPreview
            week={selectedWeek}
            setup={setup}
            movementOverrides={customizations.movementOverrides}
            accessoryAdditions={customizations.accessoryAdditions}
            equipmentMode={customizations.equipmentMode}
            freeWeightChoices={customizations.freeWeightChoices}
            equipmentProfile={profile.equipmentProfile}
            disabled={setupControlsDisabled}
            onSwap={(movement, options, selectedMovementId) => {
              setSwapTarget({ movement, options })
              setSelectedSwapId(selectedMovementId)
            }}
            onReset={(movement) => customizations.setMovementOverride(
              movement,
              movement.defaultMovementId,
            )}
            onAddAccessory={setAccessorySession}
            onRemoveAccessory={customizations.removeAccessory}
          />
        ) : null}

        <ProgramStartCard
          profile={profile}
          today={today}
          template={template}
          equipmentMode={customizations.equipmentMode}
          reviewNeeded={customizations.reviewNeeded}
          disabled={busy}
          controller={start}
          onReloadSetup={requestReload}
        />
        {reloadError ? <Text size="sm" tone="danger">{reloadError}</Text> : null}
      </Screen>

      <TemplateStartSetupSheets
        setup={setup}
        equipmentProfile={profile.equipmentProfile}
        controlsDisabled={setupControlsDisabled}
        swapTarget={swapTarget}
        selectedSwapId={selectedSwapId}
        accessorySession={accessorySession}
        customizations={customizations}
        onSelectSwap={setSelectedSwapId}
        onCloseSwap={() => {
          if (!setupControlsDisabled) setSwapTarget(null)
        }}
        onCloseAccessory={() => {
          if (!setupControlsDisabled) setAccessorySession(null)
        }}
      />

      <ConfirmDialog
        open={Boolean(blockedAction)}
        title="Discard programme setup?"
        confirmLabel="Discard and leave"
        cancelLabel="Keep editing"
        tone="danger"
        isPending={start.isPending}
        onCancel={() => setBlockedAction(null)}
        onConfirm={() => setBypassRemoval(true)}
      >
        Your starting values, substitutions, added accessories, and equipment review are only saved when the programme starts.
      </ConfirmDialog>

      <ConfirmDialog
        open={reloadConfirmOpen}
        title="Reload programme setup?"
        confirmLabel="Reload and reset"
        cancelLabel="Keep editing"
        tone="danger"
        isPending={reloadPending}
        error={reloadError}
        onCancel={() => {
          if (!reloadPending) setReloadConfirmOpen(false)
        }}
        onConfirm={() => void confirmReload()}
      >
        Reloading uses the newest programme definition and discards every unsaved setup change on this screen.
      </ConfirmDialog>
    </>
  )
}
