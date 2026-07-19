import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { api } from '@/api/client'
import { supabase } from '@/auth/supabase'
import { SignInScreen } from '@/features/auth/SignInScreen'

jest.mock('@/api/client', () => ({
  api: { magicLinkIntent: jest.fn() },
}))

jest.mock('@/auth/supabase', () => ({
  supabase: { auth: { signInWithOtp: jest.fn() } },
}))

const magicLinkIntent = api.magicLinkIntent as jest.Mock
const signInWithOtp = supabase.auth.signInWithOtp as jest.Mock

describe('SignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('uses the shared intent before sending a native PKCE magic link', async () => {
    magicLinkIntent.mockResolvedValue({
      shouldSend: true,
      shouldCreateUser: false,
      message: 'Check your inbox.',
    })
    signInWithOtp.mockResolvedValue({ error: null })
    render(<SignInScreen />)

    fireEvent.changeText(screen.getByLabelText('Email address'), ' Test@Example.com ')
    fireEvent.press(screen.getByText('Email me a sign-in link'))

    await waitFor(() => expect(screen.getByText('Check your inbox.')).toBeTruthy())
    expect(magicLinkIntent).toHaveBeenCalledWith({ email: 'Test@Example.com' })
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'Test@Example.com',
      options: {
        emailRedirectTo: 'sheetless://auth/callback',
        shouldCreateUser: false,
      },
    })
  })

  it('shows a retryable error without reporting success', async () => {
    magicLinkIntent.mockResolvedValue({
      shouldSend: true,
      shouldCreateUser: true,
      message: 'Check your inbox.',
    })
    signInWithOtp.mockResolvedValue({ error: new Error('Mail service unavailable') })
    render(<SignInScreen />)

    fireEvent.changeText(screen.getByLabelText('Email address'), 'test@example.com')
    fireEvent.press(screen.getByText('Email me a sign-in link'))

    await waitFor(() => expect(screen.getByText('Mail service unavailable')).toBeTruthy())
    expect(screen.queryByText('Check your inbox.')).toBeNull()
  })
})
