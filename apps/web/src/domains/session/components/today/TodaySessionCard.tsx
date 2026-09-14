import { Badge, Button } from '@mantine/core'
import { Lock, Play } from 'lucide-react'
import { Caption, Heading, Panel, Text } from '~/components'
import { useExperienceMode } from '~/domains/account/components'
import { collectCycleRules } from '@sheetless/domain/program/cycle-inspector'
import { PendingReviewGate } from '~/domains/program/components/PendingReview'
import { buildTodaySessionMeta } from '~/domains/session/lib/today-numbers'
import type { ProgressionDecision, ProgramInstance } from '~/domains/program'
import type { PlannedSession } from '~/domains/session'
import { TodaySessionRows } from './TodaySessionRows'

/** The Today hero: what this session is, every movement in it, and the way into it. */
export function TodaySessionCard({
  session,
  program,
  sessionNumber,
  daysPerWeek,
  isNext,
  reasonByStateKey,
  pendingDecisions,
  onReview,
  onStart,
  startPending,
  selectedSlotId,
  onSelectSlot,
}: {
  session: PlannedSession
  program?: ProgramInstance | null
  sessionNumber?: number | null
  daysPerWeek?: number | null
  isNext: boolean
  reasonByStateKey?: Record<string, string>
  pendingDecisions: ProgressionDecision[]
  onReview: () => void
  onStart: () => void
  startPending: boolean
  selectedSlotId?: string | null
  onSelectSlot?: (slotId: string) => void
}) {
  const { mode, isFull } = useExperienceMode()
  const startLocked = pendingDecisions.length > 0
  const positionLabel =
    sessionNumber && daysPerWeek ? `Session ${sessionNumber} of ${daysPerWeek}` : isNext ? 'Next session' : 'Ready'
  const rules = isFull && program?.templateDefinition
    ? collectCycleRules(program.templateDefinition, pendingDecisions)
    : []

  return (
    <Panel className="flex flex-col gap-3 vf-card-hover" p="md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge color="action" variant="light">
          {isNext && sessionNumber ? `${positionLabel} · next` : positionLabel}
        </Badge>
        <Text size="sm" tone="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {buildTodaySessionMeta(session, mode)}
        </Text>
      </div>

      <Heading order={2} size="h3" lh={1.15}>
        {session.title}
      </Heading>

      <TodaySessionRows
        session={session}
        program={program}
        reasonByStateKey={reasonByStateKey}
        selectedSlotId={selectedSlotId}
        onSelectSlot={onSelectSlot}
      />

      <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
        <PendingReviewGate pendingCount={pendingDecisions.length} onReview={onReview} className="flex">
          {/* Mantine's own sizing, not a Tailwind width: unlayered Button styles beat utilities. */}
          <Button
            disabled={startPending || startLocked}
            style={startLocked ? { pointerEvents: 'none' } : undefined}
            onClick={startLocked ? undefined : onStart}
          >
            {startLocked ? <Lock size={16} /> : <Play size={16} />}
            {startPending ? 'Starting...' : isNext ? 'Start next session' : 'Start workout'}
          </Button>
        </PendingReviewGate>

        {startLocked ? (
          <Caption>Unlocks after you review the {pendingDecisions[0].movementName} progression</Caption>
        ) : isFull && rules.length ? (
          <Caption className="ml-auto" style={{ fontVariantNumeric: 'tabular-nums' }}>
            Rules in play: {rules.map((rule) => rule.ruleId).join(' · ')}
          </Caption>
        ) : (
          <Caption>Sessions log on your phone — this one is already waiting there.</Caption>
        )}
      </div>
    </Panel>
  )
}
