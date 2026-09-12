import { createServerFn } from '@tanstack/react-start'
import { resolveAppStoreLinks, type AppStoreLinks } from '@sheetless/domain/account/app-store-links'

/**
 * Store links for the native app, from deployment env. Both are unset until the apps ship, and
 * the prompt renders a "coming soon" state rather than a dead link in that case.
 */
export const getAppStoreLinksFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AppStoreLinks> =>
    resolveAppStoreLinks({
      androidUrl: process.env.APP_STORE_URL_ANDROID,
      iosUrl: process.env.APP_STORE_URL_IOS,
    }),
)
