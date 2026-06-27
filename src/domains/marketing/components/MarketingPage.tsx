import { Box } from '@mantine/core'
import { BeginnerFriendly } from './BeginnerFriendly'
import { FeaturesGrid } from './FeaturesGrid'
import { FinalCta } from './FinalCta'
import { HowItWorks } from './HowItWorks'
import { MarketingFooter } from './MarketingFooter'
import { MarketingHero } from './MarketingHero'
import { MarketingNav } from './MarketingNav'
import { ProgramsShowcase } from './ProgramsShowcase'

export function MarketingPage() {
  return (
    <Box bg="var(--mantine-color-body)" c="var(--mantine-color-text)" className="min-h-dvh">
      <MarketingNav />
      <Box component="main">
        <Box bg="var(--mantine-color-body)">
          <MarketingHero />
        </Box>
        <Box bg="var(--vf-bg-elevated)">
          <FeaturesGrid />
        </Box>
        <Box bg="var(--mantine-color-body)">
          <HowItWorks />
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

