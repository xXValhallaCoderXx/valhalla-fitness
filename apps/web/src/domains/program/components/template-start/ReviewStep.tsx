import { StartSummaryPanel } from '../TemplateStartValues'
import { WeekOnePreview } from './WeekOnePreview'
import type { SetupStepProps } from './step-props'

/** Step 4 — what is about to be saved, and the button that saves it. */
export function ReviewStep({ start, setupOptions }: SetupStepProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <WeekOnePreview week={setupOptions.previewWeeks[0]} />
      <StartSummaryPanel
        units={start.units}
        rounding={start.rounding}
        visibleState={start.visibleState}
        missingRequiredState={start.missingRequiredState}
        hasTrainingMaxState={start.hasTrainingMaxState}
        hasWorkingLoadState={start.hasWorkingLoadState}
        customizationCount={start.customizationCount}
        startError={start.startError}
        isPending={start.isStarting}
        onStart={start.requestStartProgram}
        onViewDefaults={() => start.setStep('numbers')}
      />
    </div>
  )
}
