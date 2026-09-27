import { useState } from 'react'
import { act, render, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSettingsNavigationGuard, settingsNavigationGuard } from '../src/features/settings/settings-navigation'

type TabListener = (input: {
  route: { key: string; name: string }
  navigation: {
    getState: () => { index: number; routes: Array<{ key: string; name: string }> }
    navigate: (name: string) => void
  }
}) => { tabPress: (event: { preventDefault: () => void }) => void }

const nav = vi.hoisted(() => ({
  push: vi.fn(), back: vi.fn(), replace: vi.fn(), canGoBack: vi.fn(), dispatch: vi.fn(),
  addBack: vi.fn(), removeBack: vi.fn(), enabled: false,
  onRemove: null as null | ((event: { data: { action: unknown } }) => void),
  tabListener: null as TabListener | null,
}))
vi.mock('expo-router', async () => {
  const { useEffect } = await import('react')
  return {
    router: { push: nav.push, back: nav.back, replace: nav.replace, canGoBack: nav.canGoBack },
    useNavigation: () => ({ dispatch: nav.dispatch }),
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
    Tabs: Object.assign(({ screenListeners }: { screenListeners: TabListener }) => {
      nav.tabListener = screenListeners
      return null
    }, { Screen: () => null }),
  }
})
vi.mock('expo-router/react-navigation', () => ({ usePreventRemove: (enabled: boolean, listener: typeof nav.onRemove) => {
  nav.enabled = enabled
  nav.onRemove = listener
} }))
vi.mock('react-native', () => ({ BackHandler: { addEventListener: nav.addBack } }))
vi.mock('@/components', () => ({ ConfirmDialog: () => null }))
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }))
vi.mock('lucide-react-native', () => ({ CalendarDays: () => null, History: () => null, UserRound: () => null, ListChecks: () => null }))
vi.mock('@/lib/tokens', () => ({ fontForWeight: () => 'test', useTokens: () => ({ theme: { tones: { action: {} } } }) }))
import { useSettingsLeaveGuard } from '../src/features/settings/useSettingsLeaveGuard'
import TabsLayout from '../src/app/(tabs)/_layout'

beforeEach(() => {
  vi.resetAllMocks()
  nav.canGoBack.mockReturnValue(true)
  nav.addBack.mockReturnValue({ remove: nav.removeBack })
  nav.enabled = false
  nav.onRemove = null
  nav.tabListener = null
})

function pressTab(name: 'index' | 'you') {
  const routes = [{ key: 'today-key', name: 'index' }, { key: 'you-key', name: 'you' }]
  const navigate = vi.fn()
  const event = { preventDefault: vi.fn() }
  const listener = nav.tabListener!({ route: routes.find(route => route.name === name)!,
    navigation: { getState: () => ({ routes, index: 1 }), navigate },
  })
  act(() => listener.tabPress(event))
  return { event, navigate }
}

describe('settings navigation registry', () => {
  it('uses the top focused guard and restores its parent when a sheet leaves', () => {
    const guard = createSettingsNavigationGuard()
    const action = vi.fn()
    const page = vi.fn()
    const sheet = vi.fn()
    expect(guard.request(action)).toBe(false)
    const removePage = guard.register(page)
    const removeSheet = guard.register(sheet)
    expect(guard.request(action)).toBe(true)
    expect(sheet).toHaveBeenCalledWith(action)
    expect(page).not.toHaveBeenCalled()
    removeSheet()
    guard.request(action)
    expect(page).toHaveBeenCalledWith(action)
    removePage()
    expect(guard.request(action)).toBe(false)
    expect(action).not.toHaveBeenCalled()
  })
})

describe('settings leave guard', () => {
  it('navigates directly when clean without registering a tab or hardware guard', () => {
    const { result } = renderHook(() => useSettingsLeaveGuard({ dirty: false, pending: false, onDiscard: vi.fn() }))
    act(() => result.current.navigate('/(tabs)/you/bodyweight'))
    expect(nav.push).toHaveBeenCalledWith('/(tabs)/you/bodyweight')
    expect(nav.enabled).toBe(false)
    expect(nav.addBack).not.toHaveBeenCalled()
    expect(settingsNavigationGuard.request(vi.fn())).toBe(false)
  })

  it('keeps editing when canceled and continues a tab switch only after confirmed discard is clean', async () => {
    const discard = vi.fn()
    const action = vi.fn()
    const { result } = renderHook(() => {
      const [dirty, setDirty] = useState(true)
      return useSettingsLeaveGuard({ dirty, pending: false, onDiscard: () => { discard(); setDirty(false) } })
    })
    act(() => { expect(settingsNavigationGuard.request(action)).toBe(true) })
    expect(result.current.dialog.props.open).toBe(true)
    act(() => result.current.dialog.props.onCancel())
    expect(action).not.toHaveBeenCalled()
    expect(discard).not.toHaveBeenCalled()
    act(() => { settingsNavigationGuard.request(action) })
    act(() => result.current.dialog.props.onConfirm())
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    expect(nav.enabled).toBe(false)
    expect(discard).toHaveBeenCalledTimes(1)
    expect(settingsNavigationGuard.request(vi.fn())).toBe(false)
  })

  it('replays a prevented stack removal only after discard', async () => {
    const blockedAction = { type: 'GO_BACK' }
    const { result } = renderHook(() => {
      const [dirty, setDirty] = useState(true)
      return useSettingsLeaveGuard({ dirty, pending: false, onDiscard: () => setDirty(false) })
    })
    act(() => nav.onRemove?.({ data: { action: blockedAction } }))
    expect(nav.dispatch).not.toHaveBeenCalled()
    act(() => result.current.dialog.props.onConfirm())
    await waitFor(() => expect(nav.dispatch).toHaveBeenCalledExactlyOnceWith(blockedAction))
  })

  it('blocks pending-save navigation without offering discard', () => {
    const discard = vi.fn()
    const action = vi.fn()
    const { result } = renderHook(() => useSettingsLeaveGuard({ dirty: true, pending: true, onDiscard: discard }))
    act(() => { result.current.request(action); settingsNavigationGuard.request(action) })
    expect(action).not.toHaveBeenCalled()
    expect(result.current.dialog.props.open).toBe(false)
    expect(nav.enabled).toBe(true)
    expect(discard).not.toHaveBeenCalled()
  })

  it('guards hardware Back and removes the focused registration on unmount', async () => {
    const { result, unmount } = renderHook(() => {
      const [dirty, setDirty] = useState(true)
      return useSettingsLeaveGuard({ dirty, pending: false, onDiscard: () => setDirty(false) })
    })
    const onBack = nav.addBack.mock.calls.at(-1)![1] as () => boolean
    act(() => { expect(onBack()).toBe(true) })
    expect(nav.back).not.toHaveBeenCalled()
    act(() => result.current.dialog.props.onConfirm())
    await waitFor(() => expect(nav.back).toHaveBeenCalledTimes(1))
    unmount()
    expect(nav.removeBack).toHaveBeenCalled()
    expect(settingsNavigationGuard.request(vi.fn())).toBe(false)
  })
})

describe('settings tab presses', () => {
  it('does not ask to discard when the dirty You hub tab is reselected', () => {
    const { result } = renderHook(() => useSettingsLeaveGuard({ dirty: true, pending: false, onDiscard: vi.fn() }))
    render(<TabsLayout />)

    const { event, navigate } = pressTab('you')

    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    expect(result.current.dialog.props.open).toBe(false)
  })

  it('continues guarding a switch from dirty You to another tab', async () => {
    const { result } = renderHook(() => {
      const [dirty, setDirty] = useState(true)
      return useSettingsLeaveGuard({ dirty, pending: false, onDiscard: () => setDirty(false) })
    })
    render(<TabsLayout />)
    const { event, navigate } = pressTab('index')
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(navigate).not.toHaveBeenCalled()
    expect(result.current.dialog.props.open).toBe(true)

    act(() => result.current.dialog.props.onConfirm())

    await waitFor(() => expect(navigate).toHaveBeenCalledExactlyOnceWith('index'))
  })

  it('lets a nested reselect reach the stack removal guard and replays its pop action', async () => {
    const popToHub = { type: 'POP_TO_TOP', target: 'you-stack' }
    const { result } = renderHook(() => {
      const [dirty, setDirty] = useState(true)
      return useSettingsLeaveGuard({ dirty, pending: false, onDiscard: () => setDirty(false) })
    })
    render(<TabsLayout />)
    const { event, navigate } = pressTab('you')
    expect(event.preventDefault).not.toHaveBeenCalled()
    // The native navigator's normal focused-tab behavior now issues its stack pop.
    act(() => nav.onRemove?.({ data: { action: popToHub } }))
    expect(result.current.dialog.props.open).toBe(true)
    expect(nav.dispatch).not.toHaveBeenCalled()
    act(() => result.current.dialog.props.onConfirm())

    await waitFor(() => expect(nav.dispatch).toHaveBeenCalledExactlyOnceWith(popToHub))
    expect(navigate).not.toHaveBeenCalled()
  })
})
