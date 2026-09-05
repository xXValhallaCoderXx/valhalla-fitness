import { Button, Group, Tooltip } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Dumbbell, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { Caption, SectionLabel, Text } from '~/components'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import type {
  FreeWeightChoiceDraft,
  ProgramEquipmentMode,
  ProgramEquipmentModePreview,
  ProgramInstance,
} from '~/domains/program'
import {
  previewProgramEquipmentModeFn,
  setProgramEquipmentModeFn,
} from '~/domains/program/server/program-functions'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { accountQueryKeys } from '~/shared/lib/query-keys'
import { EquipmentModePreviewModal } from './EquipmentModePreviewModal'

export function ProgramEquipmentModeControl({
  program,
  disabled = false,
  compact = false,
}: {
  program: ProgramInstance
  disabled?: boolean
  compact?: boolean
}) {
  const router = useRouter()
  const userId = useRequiredAccountId()
  const [preview, setPreview] =
    useState<ProgramEquipmentModePreview | null>(null)
  const [choices, setChoices] = useState<FreeWeightChoiceDraft[]>([])
  const currentMode = program.equipmentMode ?? 'standard'
  const targetMode: ProgramEquipmentMode =
    currentMode === 'free_weight' ? 'standard' : 'free_weight'

  const previewMutation = useMutation({
    mutationFn: (mode: ProgramEquipmentMode) =>
      previewProgramEquipmentModeFn({
        data: { programId: program.id, targetMode: mode },
      }),
    onSuccess: (nextPreview) => {
      setChoices(nextPreview.changes.map(toChoice))
      setPreview(nextPreview)
    },
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not review equipment mode',
        message: getApiErrorMessage(
          error,
          'Unable to build the equipment conversion preview',
        ),
      })
    },
  })

  const setModeMutation = useMutation({
    mutationFn: () => {
      if (!preview) throw new Error('Review the conversion first.')
      return setProgramEquipmentModeFn({
        data: {
          programId: program.id,
          targetMode: preview.targetMode,
          expectedStateVersion: preview.expectedStateVersion,
          freeWeightPolicyVersionId:
            preview.targetMode === 'free_weight'
              ? preview.policy?.id
              : undefined,
          freeWeightPolicyChecksum:
            preview.targetMode === 'free_weight'
              ? preview.policy?.checksum
              : undefined,
          freeWeightChoices:
            preview.targetMode === 'free_weight' ? choices : undefined,
        },
      })
    },
    onSuccess: async (updatedProgram) => {
      router.options.context.queryClient.setQueryData(
        accountQueryKeys.activeProgram(userId),
        updatedProgram,
      )
      await Promise.all([
        router.options.context.queryClient.invalidateQueries({
          queryKey: accountQueryKeys.program(userId),
        }),
        router.options.context.queryClient.invalidateQueries({
          queryKey: accountQueryKeys.today(userId),
        }),
      ])
      setPreview(null)
      notifications.show({
        color: 'success',
        title:
          updatedProgram?.equipmentMode === 'free_weight'
            ? 'Free weights only is on'
            : 'All equipment is on',
        message:
          updatedProgram?.equipmentMode === 'free_weight'
            ? 'Future programme workouts now use the reviewed free-weight replacements.'
            : 'Future programme workouts can use the original equipment again.',
      })
    },
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not change equipment mode',
        message: getApiErrorMessage(
          error,
          'Unable to update this programme right now',
        ),
      })
    },
  })

  const modeLabel =
    currentMode === 'free_weight' ? 'Free weights only' : 'All equipment'
  const button = (
    <Button
      fullWidth
      variant="default"
      size={compact ? 'compact-sm' : 'sm'}
      leftSection={<Settings2 size={14} />}
      disabled={disabled}
      loading={previewMutation.isPending}
      onClick={() => {
        setModeMutation.reset()
        previewMutation.mutate(targetMode)
      }}
    >
      Change equipment mode
    </Button>
  )

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <SectionLabel>Equipment</SectionLabel>
          <Group gap={6} mt={3} wrap="nowrap">
            <Dumbbell size={15} className="shrink-0" />
            <Text size="sm" fw={700} truncate>
              {modeLabel}
            </Text>
          </Group>
          {disabled ? (
            <Caption mt={3}>
              Finish or discard the current workout to change this.
            </Caption>
          ) : null}
        </div>
        <div className="w-full sm:w-auto">
          {disabled ? (
            <Tooltip label="Finish or discard the current workout first">
              <span className="block">{button}</span>
            </Tooltip>
          ) : (
            button
          )}
        </div>
      </div>

      <EquipmentModePreviewModal
        opened={Boolean(preview)}
        targetMode={preview?.targetMode ?? targetMode}
        rows={
          preview?.changes.map((change) => ({
            ...change,
            choice: toChoice(change),
          })) ?? []
        }
        choices={choices}
        unresolvedCount={preview?.unresolved.length ?? 0}
        canApply={preview?.canApply ?? false}
        isPending={setModeMutation.isPending}
        error={
          setModeMutation.isError
            ? getApiErrorMessage(setModeMutation.error)
            : null
        }
        onChoiceChange={(original, replacementMovementId) => {
          setChoices((current) =>
            current.map((choice) =>
              sameChoice(choice, original)
                ? { ...choice, replacementMovementId }
                : choice,
            ),
          )
        }}
        onClose={() => {
          if (!setModeMutation.isPending) {
            setModeMutation.reset()
            setPreview(null)
          }
        }}
        onConfirm={() => setModeMutation.mutate()}
      />
    </>
  )
}

function toChoice(
  choice: ProgramEquipmentModePreview['changes'][number],
): FreeWeightChoiceDraft {
  return {
    templateSessionId: choice.templateSessionId,
    slotId: choice.slotId,
    phaseKey: choice.phaseKey,
    role: choice.role,
    sourceMovementId: choice.sourceMovementId,
    replacementMovementId: choice.replacementMovementId,
    policyRuleId: choice.policyRuleId,
  }
}

function sameChoice(
  left: FreeWeightChoiceDraft,
  right: FreeWeightChoiceDraft,
) {
  return (
    left.templateSessionId === right.templateSessionId &&
    left.slotId === right.slotId &&
    left.phaseKey === right.phaseKey &&
    left.role === right.role
  )
}
