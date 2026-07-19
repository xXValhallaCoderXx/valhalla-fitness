import { Badge, Button } from '@mantine/core'
import { useRouter } from '@tanstack/react-router'
import { Cloud, Compass, Download, Layers, RefreshCw } from 'lucide-react'
import { Panel } from '~/components'
import { useOnboardingTour } from '~/domains/onboarding/useOnboardingTour'
import { DataRow, SettingsSection } from './SettingsSection'

export function DataSyncSection({ activeSessionId }: { activeSessionId: string | null }) {
  const router = useRouter()
  const { start: startTour } = useOnboardingTour()
  return (
    <SettingsSection
      id="data-sync"
      icon={Cloud}
      title="Data & Sync"
      description="Manage training data and sync status."
    >
      <Panel p={0} className="divide-y divide-[var(--mantine-color-default-border)]">
        <DataRow
          icon={RefreshCw}
          title="Sync Status"
          caption="Current browser session"
          action={<Badge color="success">Synced</Badge>}
        />
        <DataRow
          icon={Download}
          title="Export Data"
          caption="Export is a future module."
          action={
            <div className="flex items-center gap-2">
              <Badge color="warning" variant="light">Soon</Badge>
              <Button variant="default" size="xs" disabled>Export</Button>
            </div>
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
