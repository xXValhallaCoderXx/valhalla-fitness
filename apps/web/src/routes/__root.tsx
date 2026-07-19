import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { AppRootDocument } from '~/components/AppRootDocument'
import {
  appRootHead,
  loadRootRoute,
  type LoadedRootRouteContext,
  type RootRouterContext,
} from '~/shared/lib/app-root-route'

export const Route = createRootRouteWithContext<RootRouterContext>()({
  beforeLoad: loadRootRoute,
  head: appRootHead,
  component: RootComponent,
})

function RootComponent() {
  return (
    <AppRootDocument routeContext={Route.useRouteContext() as LoadedRootRouteContext}>
      <Outlet />
    </AppRootDocument>
  )
}
