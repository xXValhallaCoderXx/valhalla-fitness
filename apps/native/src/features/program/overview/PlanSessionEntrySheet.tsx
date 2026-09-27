import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import type { User } from '@supabase/supabase-js'
import type { ExperienceMode } from '@sheetless/domain/account/types'
import type { ProgramInstance } from '@sheetless/domain/program/types'
import type { ProgramPlanSession } from '@sheetless/domain/program/program-plan'
import { Button, SheetModal, Text } from '@/components'
import { todayQueryOptions } from '@/features/session/queries'
import { useStartPlannedWorkout } from '@/features/session/today/useStartPlannedWorkout'
import { ProgressionReviewSheet } from '../progression/ProgressionReviewSheet'
import { PlanSessionSheet } from './PlanSessionSheet'

export function PlanSessionEntrySheet({ row, program, mode, user, onClose }: {
  row: ProgramPlanSession; program: ProgramInstance; mode: ExperienceMode; user: User; onClose: () => void
}) {
  const [review, setReview] = useState(false)
  const start = useStartPlannedWorkout(user)
  const next = row.status === 'next'
  const today = useQuery({ ...todayQueryOptions(user), enabled: next, staleTime: 0, refetchOnMount: 'always' })
  const data = today.data
  if (review) return <ProgressionReviewSheet open decisions={data?.pendingDecisions ?? []} units={program.units}
    user={user} contextLabel={program.title} onClose={() => setReview(false)} />
  if (next && (!today.isFetchedAfterMount || today.isFetching || today.isError || !today.data)) return <SheetModal open showHandle
    title={row.title} onClose={onClose}>
    {today.isError ? <><Text tone="danger">{today.error.message}</Text><Button label="Retry session" loading={today.isFetching}
      onPress={() => void today.refetch()} /></> : <Text>Checking your next workout…</Text>}
  </SheetModal>
  if (next && !data?.activeSession && (data?.activeProgram?.id !== program.id || data.plannedSession?.weekIndex !== row.globalIndex)) {
    return <SheetModal open showHandle title="Your plan has moved on" onClose={onClose}>
      <Text>Open Today for the current workout.</Text><Button label="Open Today" onPress={() => { onClose(); router.navigate('/(tabs)') }} />
    </SheetModal>
  }
  return <PlanSessionSheet row={next && data?.plannedSession ? { ...row, preview: data.plannedSession } : row}
    program={next && data?.activeProgram ? data.activeProgram : program} mode={mode} onClose={onClose}
    activeSessionId={data?.activeSession?.sessionId} hasActiveSession={Boolean(data?.activeSession)}
    pendingCount={data?.pendingDecisions.length ?? 0} busy={start.activeStarts > 0}
    error={start.isError ? start.error.message : null}
    onStart={() => { if (!start.activeStarts) start.mutate(undefined, { onSuccess: onClose }) }}
    onResume={() => {
      onClose()
      if (data?.activeSession) router.push({ pathname: '/session/[sessionId]', params: { sessionId: data.activeSession.sessionId } })
      else router.navigate('/(tabs)')
    }} onReview={() => setReview(true)} />
}
