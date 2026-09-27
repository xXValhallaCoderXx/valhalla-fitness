import { InsightsPage } from './navigation/InsightsPage'
import { InsightsSessions } from './sessions/InsightsSessions'
export function PastWorkoutsScreen() {
  return <InsightsPage title="Past workouts" page="workouts">{props =>
    <InsightsSessions sessions={props.data.recentSessions} today={props.data.insights.today} units={props.data.insights.units} onOpen={props.onOpenSession} />
  }</InsightsPage>
}
