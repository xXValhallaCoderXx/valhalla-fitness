import { Button } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { Heading, Panel, SectionLabel } from '~/components'

export function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5">
      <Panel p="lg">
        <SectionLabel>404</SectionLabel>
        <Heading order={1} size="h3" mt="xs">
          Screen not found
        </Heading>
        <Button component={Link} to="/today" mt="md" variant="light">
          Go to Today
        </Button>
      </Panel>
    </main>
  )
}
