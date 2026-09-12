import { ConfirmDialog, Text } from '~/components'
import type { TodayPayload } from '~/domains/session'
import { ProgrammeInfoModal } from '../TemplateStartInfoModal'
import type { SetupStepProps } from './step-props'

/** The three dialogs setup can raise, kept out of the step shell so it stays readable. */
export function TemplateStartModals({
  start,
  template,
  setupOptions,
  today,
}: Pick<SetupStepProps, 'start' | 'template' | 'setupOptions'> & { today: TodayPayload }) {
  return (
    <>
      <ProgrammeInfoModal
        opened={start.showProgrammeInfo}
        template={template}
        setupOptions={setupOptions}
        phases={start.phases}
        weekOptions={start.weekOptions}
        onClose={() => start.setShowProgrammeInfo(false)}
      />
      <ConfirmDialog
        open={start.showSwitchConfirm}
        title="Replace active programme?"
        confirmLabel="Replace programme"
        confirmVariant="danger"
        tone="danger"
        isPending={start.isStarting}
        onCancel={() => start.setShowSwitchConfirm(false)}
        onConfirm={start.confirmSwitch}
      >
        <div className="space-y-2">
          <Text>
            You already have{' '}
            <Text component="span" fw={600}>
              {today.activeProgram?.title ?? 'an active programme'}
            </Text>{' '}
            active.
          </Text>
          <Text>
            Starting <Text component="span" fw={600}>{template.name}</Text> will archive the current programme and make
            this your new active programme.
          </Text>
          {today.activeSession ? (
            <Text>Your workout in progress will be marked as abandoned. Saved lifts will be retained.</Text>
          ) : null}
        </div>
      </ConfirmDialog>
    </>
  )
}
