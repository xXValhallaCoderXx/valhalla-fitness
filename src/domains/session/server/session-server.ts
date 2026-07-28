export async function requireSessionUser() {
  const { requireUser } = await import('~/shared/server/require-user')
  return requireUser()
}
