import { describe, expect, it } from 'vitest'
import { resolveAppStoreLinks } from '../src/account/app-store-links'

describe('resolveAppStoreLinks', () => {
  it('reports nothing available until a store URL is configured', () => {
    expect(resolveAppStoreLinks({})).toEqual({ android: null, ios: null, available: false })
    expect(resolveAppStoreLinks({ androidUrl: '  ', iosUrl: null }).available).toBe(false)
  })

  it('accepts real store links', () => {
    const links = resolveAppStoreLinks({
      androidUrl: 'https://play.google.com/store/apps/details?id=fitness.sheetless.app',
      iosUrl: 'https://apps.apple.com/app/id123456789',
    })
    expect(links.android).toContain('play.google.com')
    expect(links.ios).toContain('apps.apple.com')
    expect(links.available).toBe(true)
  })

  it('refuses anything that is not an https link to that platform’s store', () => {
    expect(resolveAppStoreLinks({ androidUrl: 'https://example.com/app' }).android).toBeNull()
    expect(resolveAppStoreLinks({ androidUrl: 'http://play.google.com/store' }).android).toBeNull()
    expect(resolveAppStoreLinks({ androidUrl: 'not a url' }).android).toBeNull()
    // right shape, wrong platform — a swapped pair must not become a link
    expect(resolveAppStoreLinks({ iosUrl: 'https://play.google.com/store' }).ios).toBeNull()
  })
})
