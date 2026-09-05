import type { ReturnOutlook } from '@sheetless/domain/program/return-outlook'
import { returnEstimateLabel } from '@sheetless/domain/program/return-outlook'
import { Caption, Panel, SectionLabel, StatValue, Text } from '~/components'

const weight = (value: number) => Number(value.toFixed(2))

export function ReturnOverview({ outlook, units }: { outlook: ReturnOutlook; units: string }) {
  return (
    <div className="grid gap-4">
      <Panel surface="inset" p="md">
        <SectionLabel>Your way back</SectionLabel>
        <StatValue size="xl" my="xs">
          {returnEstimateLabel(outlook.totalWorkouts, outlook.daysPerWeek)}
        </StatValue>
        <Text size="sm">
          To revisit the targets below at {outlook.daysPerWeek} workouts a week.
        </Text>
        <Caption mt="xs">
          An estimate if you complete the prescribed work and accept eligible increases. Missed
          workouts or held increases move it back.
          {outlook.hasPlusSets
            ? ' Plus-set estimates assume two extra reps with the prescribed effort.'
            : ''}
        </Caption>
      </Panel>
      <div className="grid gap-3">
        <SectionLabel>Your main lifts</SectionLabel>
        {outlook.lifts.map((lift) => (
          <div key={lift.key}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Text fw={700}>{lift.name}</Text>
              <Text fw={700}>
                {lift.reference
                  ? `${weight(lift.reference.before)} → ${weight(lift.reference.after)} ${units}`
                  : 'Choose loads while logging'}
              </Text>
            </div>
            {lift.reference ? (
              <Caption>
                {lift.reference.label}
                {lift.reference.label === 'Training max'
                  ? ' · workout weights follow your programme’s percentages'
                  : ''}
              </Caption>
            ) : null}
            <Caption>
              {lift.lastWork
                ? `Last logged: ${weight(lift.lastWork.load)} ${units} × ${lift.lastWork.reps} reps · ${lift.lastWork.date}. `
                : lift.reference
                  ? `Target: previous ${lift.reference.label.toLowerCase()}. `
                  : ''}
              {returnEstimateLabel(lift.workouts, outlook.daysPerWeek)}
            </Caption>
          </div>
        ))}
        {!outlook.lifts.length ? (
          <Caption>Choose an explicit starting load in Fine-tune to see your outlook.</Caption>
        ) : null}
      </div>
      <div className="grid gap-2">
        <SectionLabel>The next couple of weeks</SectionLabel>
        {outlook.weeks.map((week) => (
          <Panel key={week.number} surface="inset" p="sm">
            <Text fw={700}>
              Week {week.number} · {week.number === 1 ? 'Ease back in' : 'Build your rhythm'}
            </Text>
            <Caption>
              {outlook.daysPerWeek} workouts · target{' '}
              {week.setPercentages.map(Math.round).join('–')}% of usual sets. Essential sets stay.
            </Caption>
            <Caption>{week.phases.join(' → ')}</Caption>
            {week.referencePercentRange ? (
              <Caption>
                Projected references: about {[...new Set(week.referencePercentRange)].join('–')}% of
                previous weights.
              </Caption>
            ) : null}
          </Panel>
        ))}
        <Text size="sm" fw={700}>
          {outlook.reviewAfter
            ? `After ${outlook.reviewAfter} workouts · Review your return`
            : 'Now · Review your return'}
        </Text>
        <Caption>
          Choose when to restore normal sets. The estimate keeps your current return settings until
          you change them.
        </Caption>

        {outlook.totalWorkouts === null ? (
          <Caption>
            Some targets need manual progression or more than {outlook.horizonWeeks} weeks in this
            scenario. We’ll leave their dates open.
          </Caption>
        ) : null}
      </div>
    </div>
  )
}
