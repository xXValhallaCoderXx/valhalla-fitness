/* global console, process */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'

const publicDir = resolve('.output/public')
const assetDir = join(publicDir, 'assets')
const serverDir = resolve('.output/server')
const failures = []

function fail(message) {
  failures.push(message)
}

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`
}

function assetPath(url) {
  return join(publicDir, url.replace(/^\//, ''))
}

function measure(url) {
  const path = assetPath(url)
  if (!existsSync(path)) {
    fail(`Build asset is missing: ${url}`)
    return { raw: 0, gzip: 0 }
  }
  const contents = readFileSync(path)
  return {
    raw: contents.byteLength,
    gzip: gzipSync(contents).byteLength,
  }
}

function routeJavaScript(manifest, routeId) {
  const root = manifest.routes.__root__
  const route = manifest.routes[routeId]
  const urls = new Set([
    ...(root.preloads ?? []),
    ...(root.scripts ?? []).map((script) => script.attrs?.src).filter(Boolean),
    ...(route?.preloads ?? []),
    ...(route?.scripts ?? []).map((script) => script.attrs?.src).filter(Boolean),
  ])
  return [...urls].filter((url) => url.endsWith('.js'))
}

if (!existsSync(assetDir) || !existsSync(serverDir)) {
  console.error('Bundle verification requires a production build. Run pnpm build first.')
  process.exit(1)
}

const startManifestFiles = readdirSync(serverDir).filter((file) => /^_tanstack-start-manifest_v-.*\.mjs$/.test(file))
if (startManifestFiles.length !== 1) {
  fail(`Expected one TanStack Start manifest, found ${startManifestFiles.length}`)
}

let startManifest = null
if (startManifestFiles.length === 1) {
  const moduleUrl = pathToFileURL(join(serverDir, startManifestFiles[0])).href
  const manifestModule = await import(moduleUrl)
  startManifest = manifestModule.tsrStartManifest()
}

if (startManifest) {
  const rootScript = startManifest.routes.__root__.scripts?.find((script) => script.attrs?.src?.endsWith('.js'))?.attrs?.src
  if (!rootScript) {
    fail('TanStack Start manifest does not declare a root JavaScript entry')
  } else {
    const rootSize = measure(rootScript)
    console.log(`Root entry ${basename(rootScript)}: ${formatKiB(rootSize.raw)} raw / ${formatKiB(rootSize.gzip)} gzip`)
    if (rootSize.raw > 600 * 1024) fail(`Root entry exceeds 600 KiB raw: ${formatKiB(rootSize.raw)}`)
    if (rootSize.gzip > 180 * 1024) fail(`Root entry exceeds 180 KiB gzip: ${formatKiB(rootSize.gzip)}`)
  }

  for (const routeId of ['/auth', '/today']) {
    const urls = routeJavaScript(startManifest, routeId)
    const gzipBytes = urls.reduce((total, url) => total + measure(url).gzip, 0)
    console.log(`${routeId} initial JavaScript: ${formatKiB(gzipBytes)} gzip across ${urls.length} assets`)
    if (gzipBytes > 300 * 1024) {
      fail(`${routeId} initial JavaScript exceeds 300 KiB gzip: ${formatKiB(gzipBytes)}`)
    }
  }

  const rootAndCoreRoutes = new Set([
    ...routeJavaScript(startManifest, '/'),
    ...routeJavaScript(startManifest, '/auth'),
    ...routeJavaScript(startManifest, '/today'),
  ])
  const chartAssets = readdirSync(assetDir)
    .filter((file) => file.endsWith('.js'))
    .filter((file) => readFileSync(join(assetDir, file), 'utf8').includes('recharts'))
    .map((file) => `/assets/${file}`)
  const chartGzipBytes = chartAssets.reduce((total, url) => total + measure(url).gzip, 0)

  console.log(`History chart JavaScript: ${formatKiB(chartGzipBytes)} gzip across ${chartAssets.length} assets`)
  if (chartAssets.length === 0) fail('No Recharts asset was found; chart isolation cannot be verified')
  if (chartGzipBytes > 140 * 1024) {
    fail(`History chart JavaScript exceeds 140 KiB gzip: ${formatKiB(chartGzipBytes)}`)
  }

  const leakedChartAssets = chartAssets.filter((url) => rootAndCoreRoutes.has(url))
  if (leakedChartAssets.length > 0) {
    fail(`Chart assets leaked into root/auth/today preloads: ${leakedChartAssets.join(', ')}`)
  }
}

const cssFiles = readdirSync(assetDir).filter((file) => file.endsWith('.css'))
const cssGzipBytes = cssFiles.reduce((total, file) => {
  const contents = readFileSync(join(assetDir, file))
  return total + gzipSync(contents).byteLength
}, 0)
console.log(`Global CSS: ${formatKiB(cssGzipBytes)} gzip across ${cssFiles.length} assets`)
if (cssGzipBytes > 50 * 1024) {
  fail(`Global CSS exceeds 50 KiB gzip: ${formatKiB(cssGzipBytes)}`)
}

for (const lazyPrefix of ['history.lazy-', 'index.lazy-']) {
  const matches = readdirSync(assetDir).filter((file) => file.startsWith(lazyPrefix) && file.endsWith('.js'))
  if (matches.length !== 1) fail(`Expected one ${lazyPrefix} route chunk, found ${matches.length}`)
}

const largestAsset = readdirSync(assetDir)
  .filter((file) => file.endsWith('.js'))
  .map((file) => ({ file, bytes: statSync(join(assetDir, file)).size }))
  .sort((a, b) => b.bytes - a.bytes)[0]
if (largestAsset) console.log(`Largest client JavaScript asset: ${largestAsset.file} (${formatKiB(largestAsset.bytes)} raw)`)

if (failures.length > 0) {
  console.error('Bundle verification failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Bundle verification passed')
