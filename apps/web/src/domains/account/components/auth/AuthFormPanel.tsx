import { Alert, Anchor, Box, Button, Card, Divider, PasswordInput, TextInput } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, ArrowRight, Check, Mail } from 'lucide-react'
import { BrandMark, Caption, Heading, SectionLabel, Text } from '~/components'
import { GoogleGIcon, PasswordStrengthMeter } from './AuthFormControls'
import { MobileAppPrompt } from './MobileAppPrompt'
import { AuthSentPanel, type SentState } from './AuthSentPanel'

export type AuthMode = 'login' | 'signup'
export type AuthMessage = { tone: 'success' | 'danger' | 'neutral'; text: string }

export function AuthFormPanel({
  email,
  password,
  mode,
  message,
  emailError,
  sent,
  passwordEnabled,
  passwordResetEnabled,
  emailValid,
  passwordPending,
  magicPending,
  resetPending,
  googlePending,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onMagicLink,
  onPasswordReset,
  onGoogleSignIn,
  onModeChange,
  onResend,
  onBackToSignIn,
}: {
  email: string
  password: string
  mode: AuthMode
  message: AuthMessage | null
  emailError: string | null
  sent: SentState | null
  passwordEnabled: boolean
  passwordResetEnabled: boolean
  emailValid: boolean
  passwordPending: boolean
  magicPending: boolean
  resetPending: boolean
  googlePending: boolean
  onEmailChange: (email: string) => void
  onPasswordChange: (password: string) => void
  onSubmit: () => void
  onMagicLink: () => void
  onPasswordReset: () => void
  onGoogleSignIn: () => void
  onModeChange: (mode: AuthMode) => void
  onResend: () => void
  onBackToSignIn: () => void
}) {
  const isSignup = passwordEnabled && mode === 'signup'
  const showReset = passwordResetEnabled && !isSignup
  const title = !passwordEnabled ? 'Sign in to Sheetless' : isSignup ? 'Create your account' : 'Welcome back'
  const subtitle = !passwordEnabled
    ? 'We’ll email you a one-tap sign-in link — no password needed.'
    : isSignup
      ? 'Start training with Sheetless — it’s free.'
      : 'Sign in to your Sheetless account.'
  const submitLabel = !passwordEnabled ? 'Send magic link' : isSignup ? 'Create account' : 'Log in'
  const submitPending = passwordEnabled ? passwordPending : magicPending
  const resendPending = sent
    ? sent.kind === 'magic'
      ? magicPending
      : sent.kind === 'reset'
        ? resetPending
        : passwordPending
    : false

  return (
    <Box component="section" className="flex min-h-screen items-center justify-center px-4 py-8 md:px-8">
      <div className="w-full max-w-[26rem]">
        <MobileAppPrompt />
        <Card className="overflow-hidden" shadow="xl" radius="lg" p={0}>
          <div className="p-6 md:p-8">
            <Link to="/" aria-label="Sheetless home" className="inline-flex w-fit">
              <BrandMark size="lg" />
            </Link>

            {sent ? (
              <AuthSentPanel
                sent={sent}
                resending={resendPending}
                errorText={message?.tone === 'danger' ? message.text : null}
                onResend={onResend}
                onBack={onBackToSignIn}
              />
            ) : (
              <>
                <Heading order={1} size="1.5rem" lh={1.1} mt="lg">
                  {title}
                </Heading>
                <Text component="p" size="sm" tone="dimmed" fw={600} mt={6}>
                  {subtitle}
                </Text>

                {message ? (
                  <Alert
                    mt="md"
                    color={message.tone === 'neutral' ? 'neutral' : message.tone}
                    role={message.tone === 'danger' ? 'alert' : 'status'}
                    icon={message.tone === 'danger' ? <AlertTriangle size={16} /> : undefined}
                  >
                    {message.text}
                  </Alert>
                ) : null}

                <Button
                  className="mt-6"
                  type="button"
                  fullWidth
                  size="md"
                  variant="default"
                  leftSection={<GoogleGIcon />}
                  onClick={onGoogleSignIn}
                  loading={googlePending}
                  disabled={googlePending}
                >
                  Continue with Google
                </Button>
                <Divider my="md" label="or" labelPosition="center" />

                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault()
                    onSubmit()
                  }}
                >
                  <label className="grid gap-1.5">
                    <SectionLabel>Email</SectionLabel>
                    <TextInput
                      type="email"
                      aria-label="Email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => onEmailChange(event.target.value)}
                      placeholder="name@example.com"
                      required
                      error={emailError}
                      rightSection={emailValid ? <Check color="var(--vf-success-text)" size={18} /> : undefined}
                      rightSectionPointerEvents="none"
                    />
                  </label>

                  {passwordEnabled ? (
                    <div className="grid gap-1.5">
                      <div className="flex items-center justify-between">
                        <SectionLabel>Password</SectionLabel>
                        {showReset ? (
                          <Button
                            type="button"
                            variant="subtle"
                            size="compact-xs"
                            onClick={onPasswordReset}
                            disabled={resetPending}
                          >
                            {resetPending ? 'Sending…' : 'Forgot?'}
                          </Button>
                        ) : null}
                      </div>
                      <PasswordInput
                        aria-label="Password"
                        autoComplete={isSignup ? 'new-password' : 'current-password'}
                        value={password}
                        onChange={(event) => onPasswordChange(event.target.value)}
                        placeholder={isSignup ? 'At least 6 characters' : '••••••••'}
                        required
                      />
                      {isSignup ? <PasswordStrengthMeter password={password} /> : null}
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    fullWidth
                    size="md"
                    loading={submitPending}
                    disabled={
                      passwordEnabled
                        ? !emailValid || !password || passwordPending
                        : !emailValid || magicPending
                    }
                  >
                    {submitLabel}
                    <ArrowRight color="currentColor" size={17} />
                  </Button>
                </form>

                {passwordEnabled ? (
                  <Button
                    className="mt-4"
                    type="button"
                    fullWidth
                    size="md"
                    variant="default"
                    leftSection={<Mail color="var(--vf-action-text)" size={17} />}
                    onClick={onMagicLink}
                    loading={magicPending}
                    disabled={!emailValid || magicPending}
                  >
                    Email me a one-time link
                  </Button>
                ) : null}

                {passwordEnabled ? (
                  <>
                    <Divider
                      my="lg"
                      label={isSignup ? 'Already have an account?' : 'New to Sheetless?'}
                      labelPosition="center"
                    />
                    <Button
                      type="button"
                      fullWidth
                      variant="default"
                      onClick={() => onModeChange(isSignup ? 'login' : 'signup')}
                    >
                      {isSignup ? 'Sign in instead' : 'Create an account'}
                    </Button>
                  </>
                ) : null}
              </>
            )}
          </div>
        </Card>

        <div className="mt-4 flex justify-center">
          <Caption component="p" ta="center" fw={600} maw="20rem">
            By continuing you agree to the{' '}
            <Anchor component={Link} to="/terms" inherit>Terms</Anchor> and acknowledge the{' '}
            <Anchor component={Link} to="/privacy" inherit>Privacy Policy</Anchor>.
          </Caption>
        </div>
      </div>
    </Box>
  )
}
