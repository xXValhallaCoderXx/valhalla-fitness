import { View } from 'react-native'
import type { UserProfile } from '@sheetless/domain/account/types'
import type { ProgramEquipmentMode, ProgramTemplateSummary } from '@sheetless/domain/program/types'
import type { TodayPayload } from '@sheetless/domain/session/types'
import {
  Badge,
  Button,
  Caption,
  ConfirmDialog,
  Panel,
  SectionLabel,
  Text,
} from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import { ProgramStartValues } from './ProgramStartValues'
import type { ProgramStartController } from './useProgramStart'

export function ProgramStartCard({
  profile,
  today,
  template,
  equipmentMode,
  reviewNeeded,
  disabled = false,
  controller,
  onReloadSetup,
}: {
  profile: UserProfile
  today: TodayPayload
  template: ProgramTemplateSummary
  equipmentMode: ProgramEquipmentMode
  reviewNeeded: boolean
  disabled?: boolean
  controller: ProgramStartController
  onReloadSetup: () => void
}) {
  const { theme } = useTokens()
  const blocked = controller.missingValues.length > 0 || reviewNeeded || controller.needsReload || disabled

  return (
    <>
      <Panel style={{ borderColor: theme.tones.action.border, gap: spacing.md, padding: spacing.md }}>
        <View style={{ gap: 4 }}>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.xs,
              justifyContent: 'space-between',
            }}
          >
            <SectionLabel tone="action">Programme setup</SectionLabel>
            <Badge tone={blocked ? 'warning' : 'success'}>
              {controller.missingValues.length
                ? `${controller.missingValues.length} missing`
                : reviewNeeded
                  ? 'Review needed'
                  : controller.needsReload
                    ? 'Reload needed'
                    : 'Ready'}
            </Badge>
          </View>
          <Text size="sm" weight={800}>
            {profile.units} · round to {profile.rounding} · {equipmentMode === 'free_weight' ? 'free weights only' : 'all equipment'}
          </Text>
          <Caption>
            Starting values and setup choices are copied into this programme only. Your saved profile estimates do not change.
          </Caption>
        </View>

        <ProgramStartValues
          profile={profile}
          stateValues={controller.stateValues}
          draftValues={controller.draftValues}
          disabled={disabled || controller.isPending || controller.needsReload}
          onChange={controller.setDraftValue}
        />

        {today.activeProgram ? (
          <Text size="sm" tone="warning">
            Starting this will replace {today.activeProgram.title} after confirmation.
          </Text>
        ) : null}
        {reviewNeeded ? (
          <Text size="sm" tone="warning">
            Review the free-weight replacements after your latest setup change.
          </Text>
        ) : null}
        {controller.startError ? (
          <Text size="sm" tone="danger">
            {controller.startError}
          </Text>
        ) : null}
        {controller.needsReload ? (
          <Button
            label="Reload setup and reset changes"
            variant="default"
            fullWidth
            disabled={disabled || controller.isPending}
            onPress={onReloadSetup}
          />
        ) : null}
        <Button
          label="Start programme"
          fullWidth
          loading={controller.isPending}
          disabled={blocked}
          onPress={controller.requestStart}
          testID="program-start"
        />
      </Panel>

      <ConfirmDialog
        open={controller.showSwitchConfirm}
        title="Replace current training?"
        confirmLabel="Replace and start"
        cancelLabel="Keep current training"
        tone="danger"
        isPending={controller.isPending}
        error={controller.startError}
        onCancel={controller.closeSwitchConfirm}
        onConfirm={controller.confirmStart}
      >
        <View style={{ gap: spacing.xs }}>
          <Text size="sm">
            Any active programme will be archived and {template.name} will become active.
          </Text>
          <Text size="sm" tone="warning">
            Any workout currently in progress and every set logged in it will be discarded. Completed workout history is unaffected.
          </Text>
        </View>
      </ConfirmDialog>
    </>
  )
}
