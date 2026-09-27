import { Button, Caption, Panel, SectionLabel } from '@/components'
import { spacing } from '@/lib/tokens'
import { InsightsPage } from './navigation/InsightsPage'
import { InsightsMovements } from './movements/InsightsMovements'
export function LiftsScreen() {
  return <InsightsPage title="Your lifts" page="lifts" range={false}>{props => <>
    <InsightsMovements movements={props.data.movementSummaries} units={props.data.insights.units} user={props.user} />
    {props.data.substitutions.length ? <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
      <SectionLabel>Recent substitutions</SectionLabel>
      {props.data.substitutions.map(item => <Button key={item.id} variant="subtle"
        label={`${item.plannedMovementName} → ${item.performedMovementName} · ${item.performedAt}`}
        onPress={() => props.onOpenSession(item.sessionId)} />)}
      <Caption>Latest 20 substitutions in loaded history. Open the workout for the saved context.</Caption>
    </Panel> : null}
  </>}</InsightsPage>
}
