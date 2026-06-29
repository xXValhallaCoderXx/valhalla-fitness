import { Box } from '@mantine/core'
import { BeginnerFriendly } from './BeginnerFriendly'
import { CoachingReceipt } from './CoachingReceipt'
import { FeaturesGrid } from './FeaturesGrid'
import { FinalCta } from './FinalCta'
import { FocusModeDemo } from './FocusModeDemo'
import { HowItWorks } from './HowItWorks'
import { MarketingFooter } from './MarketingFooter'
import { MarketingHero } from './MarketingHero'
import { MarketingNav } from './MarketingNav'
import { NoBlackBox } from './NoBlackBox'
import { PhilosophyBand } from './PhilosophyBand'
import { ProgramsShowcase } from './ProgramsShowcase'
import { SpreadsheetCompare } from './SpreadsheetCompare'

export function MarketingPage() {
  return (
    <Box bg="var(--mantine-color-body)" c="var(--mantine-color-text)" className="min-h-dvh">
      <MarketingNav />
      <Box component="main">
        <Box bg="var(--mantine-color-body)">
          <MarketingHero />
        </Box>
        <Box bg="var(--vf-surface-2)">
          <PhilosophyBand />
        </Box>
        <Box bg="var(--mantine-color-body)">
          <SpreadsheetCompare />
        </Box>
        <Box bg="var(--vf-bg-elevated)">
          <NoBlackBox />
        </Box>
        <Box bg="var(--mantine-color-body)">
          <FeaturesGrid />
        </Box>
        <Box bg="var(--vf-surface-2)">
          <HowItWorks />
        </Box>
        <Box bg="var(--mantine-color-body)">
          <CoachingReceipt />
        </Box>
        <Box bg="var(--vf-bg-elevated)">
          <FocusModeDemo />
        </Box>
        <Box bg="var(--vf-surface-2)">
          <ProgramsShowcase />
        </Box>
        <Box bg="var(--mantine-color-body)">
          <BeginnerFriendly />
        </Box>
        <Box bg="var(--vf-bg-elevated)">
          <FinalCta />
        </Box>
      </Box>
      <MarketingFooter />
    </Box>
  )
}
