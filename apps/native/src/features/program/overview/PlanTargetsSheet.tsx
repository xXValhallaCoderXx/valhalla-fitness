import type { ProgramPlan } from '@sheetless/domain/program/program-plan'
import { Button, Caption, SheetModal } from '@/components'
import { PlanTargetTable } from './PlanTargetTable'

export function PlanTargetsSheet({ plan, onClose }: { plan: ProgramPlan; onClose: () => void }) {
  return <SheetModal open showHandle title="Top sets, week by week" eyebrow="Current cycle" onClose={onClose}
    footer={<Button label="Done" fullWidth onPress={onClose} />}>
    <Caption>The heaviest prescribed main-lift targets in each week. These are workout targets, not results you have lifted.</Caption>
    <PlanTargetTable plan={plan} units={plan.units} />
    <Caption>Future weeks use your current programme references. Progression can change targets before you reach them.</Caption>
  </SheetModal>
}
