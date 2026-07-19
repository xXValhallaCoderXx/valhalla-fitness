import { render, screen, waitFor } from '@testing-library/react-native'
import type { Session } from '@supabase/supabase-js'
import { SessionProvider, useSession } from '@/auth/SessionProvider'
import { Text } from 'react-native'

const mockUnsubscribe = jest.fn()
const mockGetSession = jest.fn()
const mockOnAuthStateChange = jest.fn((callback: unknown) => {
  void callback
  return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
})

jest.mock('@/auth/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (callback: unknown) => mockOnAuthStateChange(callback),
      signOut: jest.fn(),
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
    },
  },
}))

function SessionStatus() {
  const { isLoading, session } = useSession()
  return <Text>{isLoading ? 'loading' : session?.user.id ?? 'signed-out'}</Text>
}

describe('SessionProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('restores a persisted Supabase session before protected content renders', async () => {
    const session = { user: { id: 'native-user' } } as Session
    mockGetSession.mockResolvedValue({ data: { session } })

    render(
      <SessionProvider>
        <SessionStatus />
      </SessionProvider>,
    )

    await waitFor(() => expect(screen.getByText('native-user')).toBeTruthy())
  })

  it('recovers to signed-out state when encrypted session restoration fails', async () => {
    mockGetSession.mockRejectedValue(new Error('corrupt storage'))

    render(
      <SessionProvider>
        <SessionStatus />
      </SessionProvider>,
    )

    await waitFor(() => expect(screen.getByText('signed-out')).toBeTruthy())
  })
})
