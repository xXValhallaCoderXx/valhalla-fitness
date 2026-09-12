import { Badge, Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Cloud, Compass, Download, Layers, RefreshCw } from 'lucide-react'
import { Panel } from '~/components'
import { accountExportFilename, serializeAccountExport } from '~/domains/account/lib/data-rights'
import { exportAccountDataFn } from '~/domains/account/server/data-rights-functions'
import { useOnboardingTour } from '~/domains/onboarding/useOnboardingTour'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { DataRow, SettingsSection } from './SettingsSection'

export function DataSyncSection({ activeSessionId }: { activeSessionId: string | null }) {
  const router = useRouter()
  const { start: startTour } = useOnboardingTour()
  const exportMutation = useMutation({
    mutationFn: () => exportAccountDataFn(),
    onSuccess: (accountExport) => {
      const objectUrl = URL.createObjectURL(
        new Blob([serializeAccountExport(accountExport)], { type: 'application/json' }),
      )
      const download = document.createElement('a')
      download.href = objectUrl
      download.download = accountExportFilename(accountExport.exportedAt)
      document.body.append(download)
      download.click()
      download.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
      notifications.show({
        color: 'success',
        title: 'Export ready',
        message: 'Your Sheetless account data was downloaded as JSON.',
      })
    },
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not export data',
        message: getApiErrorMessage(error, 'Unable to prepare your account export'),
      })
    },
  })

  return (
    <SettingsSection
      id="data-sync"
      icon={Cloud}
      title="Data & Sync"
      description="Manage training data and online saving."
    >
      <Panel p={0} className="divide-y divide-[var(--mantine-color-default-border)]">
        <DataRow
          icon={RefreshCw}
          title="Workout saving"
          caption="Changes save to Supabase while connected; failed set saves stay flagged for retry."
          action={<Badge color="action">Online only</Badge>}
        />
        <DataRow
          icon={Download}
          title="Export data"
          caption="Download your profile, programmes, workouts, sets, decisions, and feedback as JSON."
          action={
            <Button
              variant="default"
              size="xs"
              disabled={exportMutation.isPending}
              onClick={() => exportMutation.mutate()}
            >
              {exportMutation.isPending ? 'Preparing…' : 'Export JSON'}
            </Button>
          }
        />
        <DataRow
          icon={Compass}
          title="Getting-started tour"
          caption="Replay the welcome walkthrough."
          action={<Button variant="default" size="xs" onClick={() => startTour()}>Replay tour</Button>}
        />
        <DataRow
          icon={Layers}
          title="Workout walkthrough"
          caption={
            activeSessionId
              ? 'Replay the in-session coach-marks.'
              : 'Start a workout to replay the in-session coach-marks.'
          }
          action={
            <Button
              variant="default"
              size="xs"
              disabled={!activeSessionId}
              onClick={() => {
                if (!activeSessionId) return
                void router.navigate({
                  to: '/sessions/$sessionId',
                  params: { sessionId: activeSessionId },
                  search: { tour: 'live' },
                })
              }}
            >
              Replay walkthrough
            </Button>
          }
        />
      </Panel>
    </SettingsSection>
  )
}
