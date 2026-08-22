/** Avatar initials: "Jane Doe" → "JD", "Jane" → "J", no name → first letter of email, else "?". */
export function initialsFrom(displayName: string | null | undefined, email: string | null | undefined): string {
  const words = displayName?.trim().split(/\s+/).filter(Boolean) ?? []
  if (words.length > 0) {
    const first = words[0][0]
    const last = words.length > 1 ? words[words.length - 1][0] : ''
    return `${first}${last}`.toUpperCase()
  }
  const emailChar = email?.trim()[0]
  return emailChar ? emailChar.toUpperCase() : '?'
}
