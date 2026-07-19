import { ActionIcon, Box, Button, Tooltip } from '@mantine/core'
import { Pencil, Trash2 } from 'lucide-react'
import { Caption, Text } from '~/components'
import { AD_HOC_BADGE_LABEL } from '~/domains/session/lib/ad-hoc'
import { sessionCompletion } from '~/domains/session/lib/session-cache'
import type { WorkoutSession } from '~/shared/types'
import { SyncPill } from './Session'
import { MetaPill } from './LiveSessionControls'

export function LiveSessionHeader({
  session,
  progress,
  completedMovements,
  finishLabel,
  finishDisabled,
  onFinish,
  onEnterFocus,
  focusDisabled,
  onRename,
  onDiscard,
  discardDisabled,
}: {
  session: WorkoutSession
  progress: ReturnType<typeof sessionCompletion>
  completedMovements: number
  finishLabel: string
  finishDisabled: boolean
  onFinish: () => void
  onEnterFocus?: () => void
  focusDisabled: boolean
  onRename?: () => void
  onDiscard: () => void
  discardDisabled: boolean
}) {
  return (
    <Box
      className="sticky top-0 z-20 border-b px-4 py-2.5 backdrop-blur md:static md:px-5"
      style={{
        borderColor: 'var(--mantine-color-default-border)',
        backgroundColor: 'color-mix(in srgb, var(--mantine-color-default) 95%, transparent)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <div>
              <span className="flex items-center gap-1.5">
                <Text component="h1" size="sm" fw={900} lh={1.1} truncate>
                  {session.title}
                </Text>
                {onRename ? (
                  <ActionIcon
                    aria-label="Rename workout"
                    size="sm"
                    radius="xl"
                    variant="subtle"
                    color="neutral"
                    onClick={onRename}
                  >
                    <Pencil size={12} />
                  </ActionIcon>
                ) : null}
              </span>
              <Caption component="p" mt={2} size="xs">
                {completedMovements} of {session.movements.length} movements · {progress.completed} of {progress.total} sets
              </Caption>
            </div>
            <div className="hidden flex-wrap gap-1.5 md:flex">
              {session.isAdHoc ? (
                <MetaPill>{AD_HOC_BADGE_LABEL}</MetaPill>
              ) : (
                <>
                  <MetaPill tone={session.hardness === 'Hard' ? 'danger' : 'neutral'}>{session.hardness}</MetaPill>
                  <MetaPill>{session.weekLabel}</MetaPill>
                  <MetaPill>{session.programTitle}</MetaPill>
                </>
              )}
              <SyncPill state={session.syncState} />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Tooltip label="Discard workout">
            <ActionIcon
              type="button"
              aria-label="Discard workout"
              variant="subtle"
              color="danger"
              size="md"
              disabled={discardDisabled}
              onClick={onDiscard}
            >
              <Trash2 size={16} />
            </ActionIcon>
          </Tooltip>
          {onEnterFocus ? (
            <span className="md:hidden">
              <Button
                type="button"
                variant="default"
                size="compact-sm"
                disabled={focusDisabled}
                onClick={onEnterFocus}
                data-testid="enter-focus"
              >
                Focus
              </Button>
            </span>
          ) : null}
          <Button
            type="button"
            data-tour="live-finish"
            size="compact-sm"
            disabled={finishDisabled}
            onClick={onFinish}
          >
            {finishLabel}
          </Button>
        </div>
      </div>
    </Box>
  )
}
