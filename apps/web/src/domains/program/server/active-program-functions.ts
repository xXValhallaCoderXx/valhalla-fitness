import { createServerFn } from '@tanstack/react-start'
import {
  resolveProgressionDecisionInputSchema,
  resolveProgressionDecisionsInputSchema,
} from '~/domains/program/lib/schemas'
import { requireProgramUser } from '~/domains/program/server/program-server'
import type { ProgramInstance } from '~/domains/program'

// @sheetless/data is loaded dynamically: this module exports plain helpers
// alongside server fns, so a static import would survive the client transform
// and drag template data + the zod engine into the client bundle.
async function activeProgramData() {
  return import('@sheetless/data/program/active-program')
}

/** Web-signature shims: acquire the cookie-authenticated context themselves. */
export async function getActiveProgramInternal(): Promise<ProgramInstance | null> {
  const { getActiveProgram } = await activeProgramData()
  return getActiveProgram(await requireProgramUser())
}

export async function getPendingDecisionsInternal(programInstanceId?: string) {
  const { getPendingDecisions } = await activeProgramData()
  return getPendingDecisions(await requireProgramUser(), programInstanceId)
}

export const getActiveProgramFn = createServerFn({ method: 'GET' }).handler(
  getActiveProgramInternal,
)

export const resolveProgressionDecisionFn = createServerFn({ method: 'POST' })
  .validator((data) => resolveProgressionDecisionInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { resolveProgressionDecision } = await activeProgramData()
    return resolveProgressionDecision(await requireProgramUser(), data)
  })

export const resolveProgressionDecisionsFn = createServerFn({ method: 'POST' })
  .validator((data) => resolveProgressionDecisionsInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { resolveProgressionDecisions } = await activeProgramData()
    return resolveProgressionDecisions(await requireProgramUser(), data)
  })
