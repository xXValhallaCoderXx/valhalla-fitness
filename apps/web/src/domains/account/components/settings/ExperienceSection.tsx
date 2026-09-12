import { Button, SegmentedControl } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Sparkles } from 'lucide-react'
import {
  experienceModeDescriptions,
  experienceModeLabels,
} from '@sheetless/domain/account/experience-mode'
import { Caption, Panel, SectionLabel } from '~/components'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import type { ExperienceMode, UserProfile } from '~/domains/account/types'
import {
  restoreFullModeHintFn,
} from '~/domains/account/server/experience-functions'
import { updateSettingsFn } from '~/domains/account/server/profile-functions'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { accountQueryKeys } from '~/shared/lib/query-keys'
import { DataRow, SettingsSection } from './SettingsSection'

const modeOptions = (['guided', 'full'] as const).map((mode) => ({
  value: mode,
  label: experienceModeLabels[mode],
}))

/**
 * Reading mode saves immediately rather than through the page's draft/save bar: it restyles the
 * whole app, so a pending-save state would leave the control visibly disagreeing with the screen
 * behind it.
 */
export function ExperienceSection({ me }: { me: UserProfile }) {
  const userId = useRequiredAccountId()
  const queryClient = useQueryClient()

  const write = (next: UserProfile) => {
    queryClient.setQueryData(accountQueryKeys.profile(userId), next)
  }
  const fail = (title: string) => (error: unknown) => {
    notifications.show({ color: 'danger', title, message: getApiErrorMessage(error, 'Please try again') })
  }

  // Only the changed key rides along; the rest are required by the schema and written back as-is.
  const saveExperience = (patch: { experienceMode?: ExperienceMode; showFormulas?: boolean }) =>
    updateSettingsFn({
      data: {
        units: me.units,
        rounding: me.rounding,
        equipmentProfile: me.equipmentProfile,
        themePreference: me.themePreference,
        programStateDefaults: me.programStateDefaults,
        ...patch,
      },
    })

  const modeMutation = useMutation({
    mutationFn: (experienceMode: ExperienceMode) => saveExperience({ experienceMode }),
    onSuccess: write,
    onError: fail('Could not change reading mode'),
  })

  const formulasMutation = useMutation({
    mutationFn: (showFormulas: boolean) => saveExperience({ showFormulas }),
    onSuccess: write,
    onError: fail('Could not change formula display'),
  })

  const hintMutation = useMutation({
    mutationFn: () => restoreFullModeHintFn(),
    onSuccess: (next) => {
      write(next)
      notifications.show({
        color: 'success',
        title: 'Hints restored',
        message: 'Today will offer Full mode again next time you open it.',
      })
    },
    onError: fail('Could not restore hints'),
  })

  const mode = me.experienceMode

  return (
    <SettingsSection
      id="experience"
      icon={BookOpen}
      title="Experience"
      description="How much the app explains. Change this whenever you like — nothing else is affected."
    >
      <Panel p="md" className="grid gap-4">
        <div className="grid content-start gap-1.5">
          <SectionLabel>Reading mode</SectionLabel>
          <SegmentedControl
            fullWidth
            aria-label="Reading mode"
            data={modeOptions}
            value={mode}
            disabled={modeMutation.isPending}
            onChange={(value) => modeMutation.mutate(value as ExperienceMode)}
            data-testid="experience-mode-control"
          />
          <Caption mt={1} lh={1.4}>
            {experienceModeDescriptions[mode]}
          </Caption>
        </div>

        {mode === 'full' ? (
          <div className="grid content-start gap-1.5">
            <SectionLabel>Show formulas</SectionLabel>
            <SegmentedControl
              fullWidth
              aria-label="Show formulas"
              data={[
                { value: 'off', label: 'Off' },
                { value: 'on', label: 'On' },
              ]}
              value={me.showFormulas ? 'on' : 'off'}
              disabled={formulasMutation.isPending}
              onChange={(value) => formulasMutation.mutate(value === 'on')}
              data-testid="show-formulas-control"
            />
            <Caption mt={1} lh={1.4}>
              Renders each planned load as the expression that produced it, beside the number.
            </Caption>
          </div>
        ) : null}
      </Panel>

      <Panel p={0} mt="sm" className="divide-y divide-[var(--mantine-color-default-border)]">
        <DataRow
          icon={Sparkles}
          title="Full mode hint"
          caption={
            me.fullModeHintDismissedAt
              ? 'You have already answered the one-time Full mode offer on Today.'
              : 'Today will offer Full mode once you have enough training logged.'
          }
          action={
            <Button
              variant="default"
              size="xs"
              disabled={!me.fullModeHintDismissedAt || hintMutation.isPending}
              onClick={() => hintMutation.mutate()}
            >
              Show hints again
            </Button>
          }
        />
      </Panel>
    </SettingsSection>
  )
}
