import { InsightsPage } from './navigation/InsightsPage'
import { InsightsMuscles } from './muscle-fatigue/InsightsMuscles'
export function MusclesScreen() {
  return <InsightsPage title="Muscles" page="muscles" range={false}>{props => <InsightsMuscles {...props} />}</InsightsPage>
}
