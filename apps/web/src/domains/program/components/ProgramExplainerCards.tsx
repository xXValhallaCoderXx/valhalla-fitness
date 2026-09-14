import { Panel, SectionLabel, Text } from '~/components'

/**
 * Guided's three plain-English answers to the questions the numbers raise.
 *
 * Replaces the InfoHint popovers the page used to scatter around: the same explanations, but
 * readable without hunting for an icon. Full drops these — the inspector answers the same
 * questions with rule ids.
 */
const CARDS = [
  {
    label: 'How this cycle works',
    body: 'Each week gets a little heavier, then a lighter week lets you recover before the next cycle starts.',
  },
  {
    label: 'What decides next cycle',
    body: 'The last heavy set of each main lift. Beat it with reps to spare and the weight goes up; miss it and it comes down a little.',
  },
  {
    label: 'Missed a week?',
    body: 'Use Return after a break in Programme settings. It lowers your training weights for the time away and builds them back.',
  },
]

export function ProgramExplainerCards() {
  return (
    <div className="grid gap-3 md:grid-cols-3" data-testid="program-explainers">
      {CARDS.map((card) => (
        <Panel key={card.label} p="md">
          <SectionLabel>{card.label}</SectionLabel>
          <Text component="p" mt={4} size="sm" lh={1.5}>
            {card.body}
          </Text>
        </Panel>
      ))}
    </div>
  )
}
