import { Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState, Page, PageHeader } from '~/components'
import { useExperienceMode } from '~/domains/account/components'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import { meQueryOptions } from '~/domains/account/queries'
import type { AuthUser } from '~/domains/account/server/auth-functions'
import { builderLabel } from '~/domains/program/lib/builder-labels'
import { evaluateCustomProgramDraft, hasBlockingIssue } from '~/domains/program/lib/custom-builder-guidance'
import { customBuilderStepsFor, type CustomBuilderStep } from '~/domains/program/lib/custom-builder-ui'
import { createCustomProgramTemplateFn } from '~/domains/program/server/program-functions'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { accountQueryKeys } from '~/shared/lib/query-keys'
import { BuilderStepNavigation, CurrentPlanSummary } from './CustomBuilderChrome'
import { BuilderSidePanels } from './BuilderSidePanels'
import { CustomBuilderStepBody } from './CustomBuilderStepBody'
import { TemplateGridSection } from './grid/TemplateGridSection'
import { useCustomProgramDraft } from './useCustomProgramDraft'

/**
 * Build your own programme.
 *
 * Guided answers four questions; Full sees the `TemplateDefinition` those answers produce laid out
 * as a grid underneath, updating as the wizard changes. Both are the same object — the wizard is
 * the only thing that writes it in this release.
 */
export function CustomBuilderPage({ user }: { user: AuthUser | null }) {
  if (!user) {
    return (
      <Page>
        <EmptyState title="Sign in to build a programme">
          Custom programmes are saved to your account.
        </EmptyState>
      </Page>
    )
  }
  return <AuthedCustomBuilder />
}

function AuthedCustomBuilder() {
  const userId = useRequiredAccountId()
  const router = useRouter()
  const { mode, isFull } = useExperienceMode()
  const [step, setStep] = useState<CustomBuilderStep>('methodology')
  const draftState = useCustomProgramDraft()
  const { draft } = draftState
  const steps = customBuilderStepsFor(draft.methodology)
  const currentStepIndex = steps.findIndex((item) => item.id === step)
  const isReview = step === 'review'
  const meQuery = useQuery(meQueryOptions(userId))
  const issues = useMemo(() => evaluateCustomProgramDraft(draft), [draft])
  const canCreate = !hasBlockingIssue(issues)

  const mutation = useMutation({
    mutationFn: () => createCustomProgramTemplateFn({ data: draft }),
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not create programme',
        message: getApiErrorMessage(error, 'Unable to create custom programme'),
      })
    },
    onSuccess: async (template) => {
      notifications.show({
        color: 'success',
        title: 'Programme created',
        message: `${template.name} is ready to start.`,
      })
      await router.invalidate()
      await router.options.context.queryClient.invalidateQueries({
        queryKey: accountQueryKeys.templatesRoot(userId),
      })
      await router.navigate({ to: '/templates/$templateId/start', params: { templateId: template.id } })
    },
  })

  const moveStep = (direction: 1 | -1) => {
    const next = steps[currentStepIndex + direction]
    if (next) setStep(next.id)
  }

  return (
    <Page className="max-w-[1400px] md:px-8 lg:px-10">
      <PageHeader eyebrow="Programmes" title={builderLabel('title', mode)}>
        Pick a main lift for each day. Sheetless fills in the sets and the rule for adding weight.
      </PageHeader>

      <BuilderStepNavigation
        steps={steps}
        currentStep={step}
        disabled={mutation.isPending}
        onStepChange={setStep}
      />
      {step !== 'methodology' ? <CurrentPlanSummary draft={draft} /> : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="min-w-0">
          <CustomBuilderStepBody
            step={step}
            draftState={draftState}
            issues={issues}
            profile={meQuery.data ?? null}
          />

          <div className="mt-4 flex items-center justify-between gap-3">
            <Button
              variant="default"
              disabled={mutation.isPending || currentStepIndex === 0}
              onClick={() => moveStep(-1)}
            >
              <ChevronLeft size={14} />
              Back
            </Button>
            {isReview ? (
              <Button
                disabled={mutation.isPending || !canCreate}
                loading={mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                <Check size={16} />
                Create programme
              </Button>
            ) : (
              <Button disabled={mutation.isPending} onClick={() => moveStep(1)}>
                {steps[currentStepIndex + 1] ? `Continue to ${steps[currentStepIndex + 1].label.toLowerCase()}` : 'Next'}
                <ChevronRight size={14} />
              </Button>
            )}
          </div>
        </div>

        <BuilderSidePanels draft={draft} />
      </div>

      {isFull ? <TemplateGridSection draft={draft} profile={meQuery.data ?? null} /> : null}
    </Page>
  )
}
