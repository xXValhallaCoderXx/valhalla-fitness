import type { ErrorComponentProps } from '@tanstack/react-router'
import { Heading, Panel, SectionLabel, Text } from '~/components'
import { getApiErrorMessage } from '~/shared/lib/api-error'

export function AppError({ error }: ErrorComponentProps) {
  const message = getApiErrorMessage(error, 'The screen could not load.')

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5">
      <Panel p="lg">
        <SectionLabel c="danger">Something broke</SectionLabel>
        <Heading order={1} size="h3" mt="xs">
          The screen could not load.
        </Heading>
        <Text component="p" mt="xs" size="sm" tone="dimmed">
          {message}
        </Text>
      </Panel>
    </main>
  )
}
