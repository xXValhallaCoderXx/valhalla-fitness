import { InsightsPage } from './navigation/InsightsPage'
import { InsightsRecords } from './records/InsightsRecords'
export function BestSetsScreen() {
  return <InsightsPage title="Best sets" page="best-sets" range={false}>{props =>
    <InsightsRecords records={props.data.bestSets} user={props.user} onOpenSession={props.onOpenSession} />
  }</InsightsPage>
}
