import { Button } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import {
  AppHeaderLeading,
  BrandLockup,
  resolveAppNavigation,
  type AppHeaderBackTarget,
  type BottomNavSection,
} from '../src/components'

describe('app navigation resolver', () => {
  it.each([
    '/templates/bromley-bullmastiff/start',
    '/templates/bromley-bullmastiff/start/',
    '/templates/bromley-bullmastiff/start?week=2',
    '/templates/bromley-bullmastiff/start/#preview',
    '/templates/bromley-bullmastiff/start?week=2#preview',
  ])('maps a template-start route to Programs: %s', (route) => {
    expect(resolveAppNavigation(route)).toEqual({
      backTarget: {
        label: 'Back to Programmes',
        to: '/templates',
      },
      activeBottomNavSection: '/templates',
    })
  })

  it.each([
    '/sessions/0cb36bd8-bbb2-4e26-bf86-62257f461e52',
    '/sessions/0cb36bd8-bbb2-4e26-bf86-62257f461e52/',
    '/sessions/0cb36bd8-bbb2-4e26-bf86-62257f461e52?tour=live',
    '/sessions/0cb36bd8-bbb2-4e26-bf86-62257f461e52#current-set',
    '/sessions/0cb36bd8-bbb2-4e26-bf86-62257f461e52/summary',
    '/sessions/0cb36bd8-bbb2-4e26-bf86-62257f461e52/summary/',
    '/sessions/0cb36bd8-bbb2-4e26-bf86-62257f461e52/summary?from=finish#updates',
  ])('maps a live or summary session route to Today: %s', (route) => {
    expect(resolveAppNavigation(route)).toEqual({
      backTarget: {
        label: 'Back to Today',
        to: '/today',
      },
      activeBottomNavSection: '/today',
    })
  })

  it.each<[string, BottomNavSection]>([
    ['/today', '/today'],
    ['/today/?date=2026-07-30#workout', '/today'],
    ['/program', '/program'],
    ['/program/', '/program'],
    ['/history?tab=sessions', '/history'],
    ['/templates/#favourites', '/templates'],
  ])('keeps top-level routes active without adding a back target: %s', (route, section) => {
    expect(resolveAppNavigation(route)).toEqual({
      backTarget: null,
      activeBottomNavSection: section,
    })
  })

  it.each([
    '',
    '/',
    '/settings',
    '/templates/template-id',
    '/templates/template-id/edit',
    '/templates/template-id/start/details',
    '/sessions',
    '/sessions/',
    '/sessions/session-id/edit',
    '/sessions/session-id/summary/details',
    '/not-a-route?next=/sessions/session-id',
  ])('does not invent navigation for an unknown or incomplete route: %s', (route) => {
    expect(resolveAppNavigation(route)).toEqual({
      backTarget: null,
      activeBottomNavSection: null,
    })
  })
})

describe('AppHeaderLeading', () => {
  it('renders a labeled 44px-minimum Mantine link for a nested route', () => {
    const backTarget: AppHeaderBackTarget = {
      label: 'Back to Programmes',
      to: '/templates',
    }
    const control = AppHeaderLeading({ backTarget })

    expect(control.type).toBe(Button)
    expect(control.props.component).toBe(Link)
    expect(control.props.to).toBe('/templates')
    expect(control.props['aria-label']).toBe('Back to Programmes')
    expect(control.props['data-testid']).toBe('nested-back')
    expect(control.props.mih).toBe(44)
    expect(control.props.miw).toBe(44)
    expect(control.props.children).toBe('Back to Programmes')
  })

  it('renders the brand link when the route has no back target', () => {
    const control = AppHeaderLeading({ backTarget: null })

    expect(control.type).toBe(Link)
    expect(control.props.to).toBe('/today')
    expect(control.props['aria-label']).toBe('Sheetless home')
    expect(control.props.children.type).toBe(BrandLockup)
  })
})
