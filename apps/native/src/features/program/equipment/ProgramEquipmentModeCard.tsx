import { View } from 'react-native'
import { Settings2 } from 'lucide-react-native'
import type { User } from '@supabase/supabase-js'
import type { ProgramInstance } from '@sheetless/domain/program/types'
import { Badge, Button, Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import { EquipmentModeReviewSheet } from './EquipmentModeReviewSheet'
import { useProgramEquipmentMode } from './useProgramEquipmentMode'

export function ProgramEquipmentModeCard({
  user,
  program,
  hasActiveSession,
}: {
  user: User
  program: ProgramInstance
  hasActiveSession: boolean
}) {
  const { theme } = useTokens()
  const equipment = useProgramEquipmentMode({ user, program, hasActiveSession })
  const modeLabel = equipment.currentMode === 'free_weight' ? 'Free weights only' : 'All equipment'
  const pending = equipment.isPreviewing || equipment.isApplying

  return (
    <>
      <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.xs,
            justifyContent: 'space-between',
          }}
        >
          <SectionLabel>Equipment</SectionLabel>
          <Badge tone={equipment.currentMode === 'free_weight' ? 'action' : 'neutral'}>{modeLabel}</Badge>
        </View>
        <Caption>
          Change how every future phase handles non-free-weight movements. Manual programme customizations stay in place.
        </Caption>
        {hasActiveSession ? (
          <Text size="sm" tone="warning">
            Finish or discard the current workout before changing this.
          </Text>
        ) : null}
        {equipment.previewError ? (
          <Text size="sm" tone="danger">{equipment.previewError}</Text>
        ) : null}
        {equipment.successMessage ? (
          <Text size="sm" tone="success">{equipment.successMessage}</Text>
        ) : null}
        <Button
          label={equipment.previewError ? 'Retry equipment review' : 'Change equipment mode'}
          variant="default"
          fullWidth
          disabled={hasActiveSession}
          loading={equipment.isPreviewing}
          leftSection={<Settings2 color={theme.text} size={16} />}
          style={{ minHeight: 44 }}
          onPress={equipment.requestReview}
          testID="change-equipment-mode"
        />
      </Panel>

      <EquipmentModeReviewSheet
        open={Boolean(equipment.preview)}
        targetMode={equipment.preview?.targetMode ?? equipment.targetMode}
        rows={equipment.reviewRows}
        choices={equipment.choices}
        unresolved={equipment.unresolved}
        unresolvedCount={equipment.preview?.unresolved.length ?? 0}
        canApply={Boolean(equipment.preview?.canApply) && !hasActiveSession}
        isPending={pending}
        error={hasActiveSession
          ? 'Finish or discard the current workout before changing equipment mode.'
          : equipment.applyError}
        onChoiceChange={equipment.updateChoice}
        onClose={equipment.closeReview}
        onConfirm={equipment.apply}
      />
    </>
  )
}
