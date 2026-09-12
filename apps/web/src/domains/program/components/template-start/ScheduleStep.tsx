import { QuickFactsCard } from '../TemplateStartValues'
import type { SetupStepProps } from './step-props'

/** Step 3 — which variant of the programme, and the shape of the cycle that follows from it. */
export function ScheduleStep({ start, scheduleSelector }: SetupStepProps) {
  return (
    <div className="space-y-4">
      {scheduleSelector}
      <QuickFactsCard facts={start.quickFacts} />
    </div>
  )
}
