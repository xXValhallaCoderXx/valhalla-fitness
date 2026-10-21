import { useState, type ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import type { UserProfile } from '@sheetless/domain/account/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  user: { id: 'account-a' },
  me: { data: undefined as UserProfile | undefined, isPending: false, isError: false, isFetching: false,
    error: null as Error | null, refetch: vi.fn() },
}))
vi.mock('@/lib/account', () => ({ useMe: () => state.me }))
vi.mock('@/lib/session-provider', () => ({ useSession: () => ({ user: state.user }) }))
vi.mock('expo-router', () => ({ router: { canGoBack: () => false, replace: vi.fn(), back: vi.fn() } }))
vi.mock('@/components', () => ({
  Text: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Panel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Button: ({ label, onPress }: { label: string; onPress: () => void }) => <button onClick={onPress}>{label}</button>,
}))
vi.mock('../src/features/settings/SettingsPage', () => ({
  SettingsPage: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
import { SettingsProfileBoundary } from '../src/features/settings/SettingsProfileBoundary'

function DraftProbe() {
  const [draft, setDraft] = useState('')
  return <input aria-label="Editor draft" value={draft} onChange={event => setDraft(event.target.value)} />
}
const editor = () => <SettingsProfileBoundary title="You">{() => <DraftProbe />}</SettingsProfileBoundary>
beforeEach(() => {
  vi.clearAllMocks()
  state.user = { id: 'account-a' }
  state.me = { data: { id: 'account-a' } as UserProfile, isPending: false, isError: false, isFetching: false,
    error: null, refetch: vi.fn() }
})

describe('settings profile boundary', () => {
  it('keeps the same editor instance and unsaved input during a failed background refresh', () => {
    const { rerender } = render(editor())
    fireEvent.change(screen.getByLabelText('Editor draft'), { target: { value: 'Unsaved input' } })
    state.me = { ...state.me, isError: true, error: new Error('Connection lost') }
    rerender(editor())
    expect((screen.getByLabelText('Editor draft') as HTMLInputElement).value).toBe('Unsaved input')
    expect(screen.queryByText('Profile unavailable')).toBeNull()
  })

  it('shows recovery when there is no usable cached profile', () => {
    state.me = { ...state.me, data: undefined, isError: true, error: new Error('Connection lost') }
    render(editor())
    expect(screen.queryByLabelText('Editor draft')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(state.me.refetch).toHaveBeenCalledTimes(1)
  })

  it('does not render a different account profile while its own profile loads', () => {
    state.user = { id: 'account-b' }
    render(editor())
    expect(screen.queryByLabelText('Editor draft')).toBeNull()
    expect(screen.getByText('Profile unavailable')).toBeTruthy()
  })
})
