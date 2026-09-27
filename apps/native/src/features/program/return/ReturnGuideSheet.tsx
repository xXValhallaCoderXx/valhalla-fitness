import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ProgramInstance } from '@sheetless/domain/program/types'
import { getReturnGuide } from '@sheetless/data/program/return-guide'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { Button, SheetModal, Text } from '@/components'
import { useSession } from '@/lib/session-provider'
import { buildUserContext } from '@/lib/account'
import { ReturnGuideForm } from './ReturnGuideForm'
import type { ReturnGuideState } from './useReturnGuideDraft'

/** Mount as a sibling of Plan settings; one native Modal is open at a time. */
export function ReturnGuideSheet({ open, program, onClose }: { open: boolean; program: ProgramInstance; onClose: () => void }) {
  const { user } = useSession()
  return open && user ? <OpenReturnGuide key={`${user.id}:${program.id}`} program={program} onClose={onClose} /> : null
}

function OpenReturnGuide({ program, onClose }: { program: ProgramInstance; onClose: () => void }) {
  const { user } = useSession()
  const [generation, setGeneration] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [accepted, setAccepted] = useState<ReturnGuideState | null>(null)
  const query = useQuery({
    queryKey: [...accountQueryKeys.program(user!.id), 'return'],
    queryFn: () => getReturnGuide(buildUserContext(user!)),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  })
  const reload = async () => {
    setRefreshing(true)
    setAccepted(null)
    await query.refetch()
    setGeneration(current => current + 1)
    setRefreshing(false)
  }
  if (!accepted && !refreshing && query.isFetchedAfterMount && query.isSuccess && query.data.program.id === program.id) {
    setAccepted(query.data)
  }
  if (accepted && !refreshing) return <ReturnGuideForm key={generation} state={accepted} onClose={onClose} onRefresh={() => void reload()} />
  // Cached state may be useful elsewhere, but this mutation form requires a fresh read each opening.
  const waiting = !query.isFetchedAfterMount || refreshing
  const wrongProgram = query.data && query.data.program.id !== program.id
  if (waiting || query.isError || !query.data || wrongProgram) return <SheetModal open showHandle title="Return after a break" onClose={onClose}>
    {query.isError ? <><Text tone="danger">{query.error.message}</Text><Button label="Retry" loading={query.isFetching} onPress={() => void reload()} /></> :
      wrongProgram && !waiting ? <><Text>This plan is no longer active. Reopen the guide from your current plan.</Text><Button label="Close" onPress={onClose} /></> :
        <Text tone="dimmed">Loading your current programme…</Text>}
  </SheetModal>
  return null
}
