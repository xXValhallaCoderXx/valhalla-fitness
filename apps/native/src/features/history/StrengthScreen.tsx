import { InsightsPage } from './navigation/InsightsPage'
import { useInsightsState } from './navigation/InsightsState'
import { InsightsStrength } from './strength/InsightsStrength'

export function StrengthScreen() {
  const { state } = useInsightsState()
  return <InsightsPage title="Strength" page="strength">{props =>
    <InsightsStrength insights={props.data.insights} gating={props.gating} range={state.range}
      user={props.user} advanced={props.advanced} onOpenSession={props.onOpenSession} />
  }</InsightsPage>
}
