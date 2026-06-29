import { describe, expect, it } from 'vitest'
import { getAuthPolicy } from '~/shared/lib/auth-config'

describe('auth policy', () => {
  it('keeps local auth fully enabled', () => {
    expect(getAuthPolicy({ PROD: false })).toEqual({
      passwordSignInEnabled: true,
      passwordSignUpEnabled: true,
      passwordResetEnabled: true,
      magicLinkEnabled: true,
      magicLinkRequiresBetaAccess: false,
    })
  })

  it('disables production password auth while allowing beta-gated magic links', () => {
    expect(getAuthPolicy({ PROD: true })).toEqual({
      passwordSignInEnabled: false,
      passwordSignUpEnabled: false,
      passwordResetEnabled: false,
      magicLinkEnabled: true,
      magicLinkRequiresBetaAccess: true,
    })
  })
})
