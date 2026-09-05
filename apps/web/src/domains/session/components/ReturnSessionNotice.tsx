import type { PlannedSession } from '@sheetless/domain/session/types'
import { returnSessionDescription } from '@sheetless/domain/program/return-settings'
import { Caption, Panel } from '~/components'

export function ReturnSessionNotice({ session }: { session: PlannedSession }) {
  const description = returnSessionDescription(session)
  return description ? (
    <Panel surface="inset" p="sm" my="sm">
      <Caption>{description}</Caption>
    </Panel>
  ) : null
}
