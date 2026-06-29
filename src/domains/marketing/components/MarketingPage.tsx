import { Box } from '@mantine/core'
import { FeaturesGrid } from './FeaturesGrid'
import { FinalCta } from './FinalCta'
import { FocusModeDemo } from './FocusModeDemo'
import { HowItWorks } from './HowItWorks'
import { MarketingFooter } from './MarketingFooter'
import { MarketingHero } from './MarketingHero'
import { MarketingNav } from './MarketingNav'
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
        <Box bg="var(--vf-surface-2)">
          <FeaturesGrid />
        </Box>
        <Box bg="var(--mantine-color-body)">
          <HowItWorks />
        </Box>
        <Box bg="var(--vf-surface-2)">
          <FocusModeDemo />
        </Box>
        <Box bg="var(--mantine-color-body)">
          <ProgramsShowcase />
        </Box>
        <Box bg="var(--vf-bg-elevated)">
          <FinalCta />
        </Box>
      </Box>
      <MarketingFooter />
    </Box>
  )
}
