import { createLazyFileRoute } from '@tanstack/react-router'
import { CustomBuilderPage } from '~/domains/program/components/custom-builder/CustomBuilderPage'

export const Route = createLazyFileRoute('/templates/new')({
  component: CustomBuilderRoute,
})

function CustomBuilderRoute() {
  const { user } = Route.useRouteContext()
  return <CustomBuilderPage user={user} />
}
