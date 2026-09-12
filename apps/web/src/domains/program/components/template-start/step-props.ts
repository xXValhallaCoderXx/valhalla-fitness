import type { ReactNode } from 'react'
import type { UserProfile } from '~/domains/account'
import type { ProgramSetupOptions, ProgramTemplateSummary } from '~/domains/program'
import type { useTemplateStartController } from '../useTemplateStartController'

/**
 * Every step reads from one controller.
 *
 * Threading twenty individual props through four components invites a step to be handed a stale
 * copy of one; the controller stays the single source and each step takes what it needs from it.
 */
export type SetupStepProps = {
  start: ReturnType<typeof useTemplateStartController>
  template: ProgramTemplateSummary
  me: UserProfile
  setupOptions: ProgramSetupOptions
  scheduleSelector?: ReactNode
}
