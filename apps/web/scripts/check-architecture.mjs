/* global console, process */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, sep } from 'node:path'

const repoRoot = process.cwd()
const failures = []
const warnings = []
const coreDomains = ['account', 'program', 'session', 'history', 'movement', 'onboarding']

const existingOversizedComponents = new Set()

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    // node_modules can appear under packages/* and its pnpm symlinks lead into
    // the store, where vendored src/*.ts would be scanned as ours.
    if (name === 'node_modules' || name.startsWith('.')) return []
    const path = join(directory, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

function repoPath(path) {
  return relative(repoRoot, path).replaceAll('\\', '/')
}

function lineCount(contents) {
  const normalized = contents.trimEnd()
  return normalized === '' ? 0 : normalized.split(/\r?\n/).length
}

function exportedModuleSpecifiers(contents) {
  return Array.from(
    contents.matchAll(
      /export\s+(?:type\s+)?(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g,
    ),
    (match) => match[1],
  )
}

function importedModuleSpecifiers(contents) {
  return Array.from(
    contents.matchAll(
      /(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    ),
    (match) => match[1],
  )
}

function isServerModuleSpecifier(specifier) {
  return specifier.split('/').includes('server')
}

const routeFiles = walk(join(repoRoot, 'src/routes'))
  .filter((path) => ['.ts', '.tsx'].includes(extname(path)))
  .filter((path) => !path.endsWith('routeTree.gen.ts'))

for (const path of routeFiles) {
  const file = repoPath(path)
  const contents = readFileSync(path, 'utf8')
  const lines = lineCount(contents)
  if (lines > 40) failures.push(`${file} has ${lines} lines; route adapters must stay at or below 40`)
  if (/from\s+['"][^'"]*(?:\/server\/|\/shared\/server)[^'"]*['"]/.test(contents)) {
    failures.push(`${file} imports a server-only module`)
  }
}

const sharedFiles = walk(join(repoRoot, 'src/shared')).filter((path) => ['.ts', '.tsx'].includes(extname(path)))
for (const path of sharedFiles) {
  const file = repoPath(path)
  const contents = readFileSync(path, 'utf8')
  if (/from\s+['"]~\/domains\//.test(contents)) {
    failures.push(`${file} creates a shared-to-domain dependency`)
  }
}

const domainIndexFiles = walk(join(repoRoot, 'src/domains')).filter((path) => path.endsWith('/index.ts'))
for (const path of domainIndexFiles) {
  const file = repoPath(path)
  const contents = readFileSync(path, 'utf8')
  if (exportedModuleSpecifiers(contents).some(isServerModuleSpecifier)) {
    failures.push(`${file} exports a server-only module through a client barrel`)
  }
}

for (const domain of coreDomains) {
  const domainRoot = join(repoRoot, 'src/domains', domain)
  const rootIndexPath = join(domainRoot, 'index.ts')
  const rootTypesPath = join(domainRoot, 'types.ts')
  const rootIndexFile = repoPath(rootIndexPath)
  const rootTypesFile = repoPath(rootTypesPath)

  if (!existsSync(rootIndexPath)) {
    failures.push(`${rootIndexFile} is required as the ${domain} domain's public client barrel`)
  } else {
    const contents = readFileSync(rootIndexPath, 'utf8')
    const exportedModules = exportedModuleSpecifiers(contents)

    if (!exportedModules.includes('./types')) {
      failures.push(`${rootIndexFile} must export the domain's public types`)
    }
    if (!/export\s+type\s+\*\s+from\s+['"]\.\/types['"]/.test(contents)) {
      failures.push(`${rootIndexFile} must export ./types with an export type declaration`)
    }
    if (exportedModules.some(isServerModuleSpecifier)) {
      failures.push(`${rootIndexFile} exports a server-only module through a client barrel`)
    }

    const queriesPath = join(domainRoot, 'queries.ts')
    if (existsSync(queriesPath) && !exportedModules.includes('./queries')) {
      failures.push(`${rootIndexFile} must export the domain's query options`)
    }

    const componentsIndexPath = join(domainRoot, 'components/index.ts')
    if (existsSync(componentsIndexPath) && !exportedModules.includes('./components')) {
      failures.push(`${rootIndexFile} must export the domain's public components`)
    }
  }

  if (!existsSync(rootTypesPath)) {
    failures.push(`${rootTypesFile} is required as the ${domain} domain's public type facade`)
  } else {
    const contents = readFileSync(rootTypesPath, 'utf8')
    const lines = lineCount(contents)
    if (lines > 100) {
      failures.push(`${rootTypesFile} has ${lines} lines and exceeds the 100-line type facade budget`)
    }
    if (/^\s*import\s+(?!type\b)/m.test(contents)) {
      failures.push(`${rootTypesFile} must use type-only imports`)
    }
    if (/^\s*export\s+(?!type\b|interface\b)/m.test(contents)) {
      failures.push(`${rootTypesFile} must expose type-only exports`)
    }
    if (exportedModuleSpecifiers(contents).some(isServerModuleSpecifier)) {
      failures.push(`${rootTypesFile} exports types from a server-only module`)
    }
  }

  const leafTypesDirectory = join(domainRoot, 'types')
  if (existsSync(leafTypesDirectory)) {
    const leafTypeFiles = walk(leafTypesDirectory).filter((path) => path.endsWith('.ts'))
    for (const path of leafTypeFiles) {
      const file = repoPath(path)
      const lines = lineCount(readFileSync(path, 'utf8'))
      if (lines > 350) {
        failures.push(`${file} has ${lines} lines and exceeds the 350-line type module budget`)
      }
    }
  }
}

const sharedTypesRoot = join(repoRoot, 'src/shared/types')
const allowedSharedTypeFiles = new Set(['database.ts', 'index.ts', 'training-primitives.ts'])
const allowedSharedTypeExports = new Set([
  'Database',
  'MovementRole',
  'ProgramStateDefaults',
  'SessionHardness',
  'Unit',
])
const sharedTypeFiles = walk(sharedTypesRoot).filter((path) =>
  ['.ts', '.tsx'].includes(extname(path)),
)

for (const path of sharedTypeFiles) {
  const file = repoPath(path)
  const relativeFile = relative(sharedTypesRoot, path).replaceAll('\\', '/')
  if (!allowedSharedTypeFiles.has(relativeFile)) {
    failures.push(
      `${file} is not an allowed shared type module; domain-owned types belong under src/domains`,
    )
  }
}

const sharedTypesIndexPath = join(sharedTypesRoot, 'index.ts')
if (existsSync(sharedTypesIndexPath)) {
  const contents = readFileSync(sharedTypesIndexPath, 'utf8')
  const namedExports = Array.from(
    contents.matchAll(/export\s+type\s+\{([^}]*)\}\s+from\s+['"][^'"]+['"]/g),
  ).flatMap((match) =>
    match[1]
      .split(',')
      .map((name) => name.trim().split(/\s+as\s+/)[1] ?? name.trim().split(/\s+as\s+/)[0])
      .filter(Boolean),
  )
  const exportedNames = new Set(namedExports)

  if (/export\s+(?:type\s+)?\*/.test(contents)) {
    failures.push('src/shared/types/index.ts must use named type exports, not export stars')
  }
  if (/^\s*export\s+(?!type\b)/m.test(contents) || /export\s+type\s+(?!\s*\{)/.test(contents)) {
    failures.push('src/shared/types/index.ts must contain only named type re-exports')
  }
  for (const name of exportedNames) {
    if (!allowedSharedTypeExports.has(name)) {
      failures.push(`src/shared/types/index.ts exports non-shared type ${name}`)
    }
  }
  for (const name of allowedSharedTypeExports) {
    if (!exportedNames.has(name)) {
      failures.push(`src/shared/types/index.ts must export shared type ${name}`)
    }
  }
}

const legacySharedTypeModules = new Set([
  '~/shared/types/training',
  '~/shared/types/program-template',
])
const importScanRoots = ['src', 'tests', 'scripts']
  .map((directory) => join(repoRoot, directory))
  .filter(existsSync)

for (const root of importScanRoots) {
  const files = walk(root).filter((path) => ['.ts', '.tsx', '.js', '.mjs'].includes(extname(path)))
  for (const path of files) {
    const file = repoPath(path)
    const contents = readFileSync(path, 'utf8')
    for (const specifier of new Set(importedModuleSpecifiers(contents))) {
      const isLegacySharedTypeImport =
        legacySharedTypeModules.has(specifier) ||
        (file.startsWith('src/shared/types/') &&
          ['./training', './program-template'].includes(specifier))
      if (isLegacySharedTypeImport) {
        failures.push(`${file} imports removed legacy shared type module ${specifier}`)
      }

      const domainTypesMatch = specifier.match(/^~\/domains\/([^/]+)\/types(?:\/|$)/)
      if (
        domainTypesMatch &&
        !file.startsWith(`src/domains/${domainTypesMatch[1]}/`)
      ) {
        failures.push(
          `${file} imports ${specifier} directly; external consumers must use the domain's public root barrel`,
        )
      }
    }
  }
}

const serverModuleBudgets = new Map([
  ['src/domains/program/server/program-functions.ts', 40],
  ['src/domains/session/server/session-functions.ts', 40],
  ['src/domains/session/server/session-read-functions.ts', 60],
  ['src/domains/session/server/session-lifecycle-functions.ts', 60],
  ['src/domains/session/server/session-completion-functions.ts', 40],
  ['src/domains/session/server/session-set-functions.ts', 40],
  ['src/domains/session/server/session-accessory-functions.ts', 550],
  ['src/domains/session/server/session-ad-hoc-functions.ts', 250],
  ['src/domains/session/server/session-movement-functions.ts', 225],
  ['src/domains/session/server/session-server.ts', 40],
  ['src/domains/session/server/session-server-helpers.ts', 40],
])

for (const [file, budget] of serverModuleBudgets) {
  const path = join(repoRoot, file)
  const lines = lineCount(readFileSync(path, 'utf8'))
  if (lines > budget) {
    failures.push(`${file} has ${lines} lines and exceeds its ${budget}-line server module budget`)
  }
}

const componentFiles = [
  ...walk(join(repoRoot, 'src/components')),
  ...walk(join(repoRoot, 'src/domains')),
].filter((path) => path.endsWith('.tsx'))

for (const path of componentFiles) {
  const file = repoPath(path)
  const lines = lineCount(readFileSync(path, 'utf8'))
  if (lines <= 300) continue
  if (existingOversizedComponents.has(file)) {
    warnings.push(`${file} remains above the 300-line component gate (${lines})`)
  } else {
    failures.push(`${file} has ${lines} lines and exceeds the 300-line component gate`)
  }
}

// Workspace packages must stay framework-free: they are shared with the native
// app, so no web/native UI runtimes and no app-alias imports. @sheetless/data is
// the one package allowed to know about Supabase — and only its types: value
// imports would bundle a second supabase-js into whichever app forgets to dedupe.
const packagesRoot = join(repoRoot, '../../packages')
const packageSources = walk(packagesRoot).filter(
  (path) => ['.ts', '.tsx'].includes(extname(path)) && path.includes(`${sep}src${sep}`),
)
const defaultBannedPackageImport =
  /from\s+['"](?:(react|react-dom|react-native|@mantine|@tanstack|@supabase|@dnd-kit|driver\.js|lucide-react|tailwind|clsx)[/'"]|~\/)/
const dataBannedPackageImport =
  /from\s+['"](?:(react|react-dom|react-native|@mantine|@tanstack|@dnd-kit|driver\.js|lucide-react|tailwind|clsx)[/'"]|~\/|apps\/)/
const nonTypeSupabaseImport = /(?:^|\n)\s*(?:import\s+(?!type\b)[^'"]*|export\s+(?!type\b)[^'"]*)from\s+['"]@supabase/
for (const path of packageSources) {
  const contents = readFileSync(path, 'utf8')
  const packageName = relative(packagesRoot, path).split(sep)[0]
  const banned = packageName === 'data' ? dataBannedPackageImport : defaultBannedPackageImport
  const match = contents.match(banned)
  if (match) {
    failures.push(
      `${relative(join(repoRoot, '../..'), path)} imports a framework/app dependency banned in packages/* (${match[0].slice(5)})`,
    )
  }
  if (packageName === 'data' && nonTypeSupabaseImport.test(contents)) {
    failures.push(
      `${relative(join(repoRoot, '../..'), path)} value-imports @supabase — packages/data may import Supabase types only`,
    )
  }
  if (packageName === 'domain' && /from\s+['"]@sheetless\/data/.test(contents)) {
    failures.push(
      `${relative(join(repoRoot, '../..'), path)} imports @sheetless/data — domain sits below data and may not depend on it`,
    )
  }
  if (/from\s+['"][^'"]*apps\//.test(contents)) {
    failures.push(
      `${relative(join(repoRoot, '../..'), path)} imports from apps/ — packages may never depend on an app shell`,
    )
  }
}

for (const warning of warnings) console.warn(`Architecture warning: ${warning}`)

if (failures.length > 0) {
  console.error('Architecture verification failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Architecture verification passed with ${warnings.length} known warning(s)`)
