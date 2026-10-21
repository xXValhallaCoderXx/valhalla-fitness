import { InsightsPage } from './navigation/InsightsPage'
import { useInsightsState } from './navigation/InsightsState'
import { InsightsOverview } from './overview/InsightsOverview'

export function InsightsScreen() {
  const { state } = useInsightsState()
  return <InsightsPage title="Insights" page="index">{props =>
    <InsightsOverview {...props} range={state.range} />
  }</InsightsPage>
}
