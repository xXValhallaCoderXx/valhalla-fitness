/* global console, process */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const repoRoot = process.cwd()
const failures = []
const allowedMarkdown = new Set([
  '.github/copilot-instructions.md',
  '.github/instructions/project-standards.instructions.md',
  'AGENTS.md',
  'CLAUDE.md',
  'README.md',
])
const deletedDocumentNames = [
  'RAILWAY.md',
  'dots-plan.md',
  'final-release-plan.md',
  'main-app-spec.md',
  'release-checklist.md',
  'research/',
  'tests/e2e/README.md',
]

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    if (['.git', '.output', 'node_modules'].includes(name)) return []
    const path = join(directory, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

function repoPath(path) {
  return relative(repoRoot, path).replaceAll('\\', '/')
}

const markdownFiles = walk(repoRoot)
  .map(repoPath)
  .filter((path) => path.endsWith('.md'))

for (const path of markdownFiles) {
  if (!allowedMarkdown.has(path)) failures.push(`Unexpected human-facing document remains: ${path}`)
}

for (const path of allowedMarkdown) {
  if (!markdownFiles.includes(path)) {
    failures.push(`Required documentation file is missing: ${path}`)
    continue
  }
  const contents = readFileSync(join(repoRoot, path), 'utf8')
  for (const deletedName of deletedDocumentNames) {
    if (contents.includes(deletedName)) failures.push(`${path} references deleted documentation: ${deletedName}`)
  }
  if (/https:\/\/sheetless\.fitness\/auth\/callback/i.test(contents)) {
    failures.push(`${path} uses the apex auth callback instead of https://www.sheetless.fitness/auth/callback`)
  }
  if (/\bDexie\b/.test(contents)) {
    failures.push(`${path} describes the retired Dexie/offline persistence architecture`)
  }
  if (contents.includes('docs/templates')) {
    failures.push(`${path} references the retired generated documentation directory`)
  }
}

const readme = readFileSync(join(repoRoot, 'README.md'), 'utf8')
if (!/sole human-facing source/i.test(readme)) {
  failures.push('README.md must identify itself as the sole human-facing source')
}
if (!/https:\/\/www\.sheetless\.fitness/.test(readme)) {
  failures.push('README.md must declare https://www.sheetless.fitness as the canonical host')
}
if (!/online-only/i.test(readme)) {
  failures.push('README.md must explicitly describe the beta as online-only')
}
for (const requiredReleaseContract of [
  'Recorded release posture',
  '/privacy`, `/terms',
  'self-service account deletion',
  'pnpm db:audit',
]) {
  if (!readme.includes(requiredReleaseContract)) {
    failures.push(`README.md is missing release contract: ${requiredReleaseContract}`)
  }
}

if (failures.length > 0) {
  console.error('Documentation verification failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Documentation verification passed (${markdownFiles.length} retained files)`)
