/* global console, process */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const publicDir = '.output/public'
const manifestPath = join(publicDir, 'manifest.json')
const swPath = join(publicDir, 'sw.js')

const failures = []

function fail(message) {
  failures.push(message)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    fail(`Unable to parse ${path}: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

function pngSize(path) {
  const buffer = readFileSync(path)
  const pngSignature = '89504e470d0a1a0a'
  if (buffer.subarray(0, 8).toString('hex') !== pngSignature) {
    fail(`${path} is not a PNG file`)
    return null
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  }
}

assert(existsSync(manifestPath), `${manifestPath} is missing`)
assert(existsSync(swPath), `${swPath} is missing`)

const manifest = existsSync(manifestPath) ? readJson(manifestPath) : null
if (manifest) {
  assert(manifest.name === 'Sheetless', 'Manifest name must be Sheetless')
  assert(manifest.short_name === 'Sheetless', 'Manifest short_name must be Sheetless')
  assert(manifest.start_url === '/today', 'Manifest start_url must be /today')
  assert(manifest.scope === '/', 'Manifest scope must be /')
  assert(manifest.display === 'standalone', 'Manifest display must be standalone')
  assert(manifest.theme_color === '#197f9a', 'Manifest theme_color must match app theme')
  assert(manifest.background_color === '#fbfdfc', 'Manifest background_color must match app shell')

  const icons = Array.isArray(manifest.icons) ? manifest.icons : []
  const requiredIcons = [
    { src: '/pwa/icon-192.png', size: 192, purpose: null },
    { src: '/pwa/icon-512.png', size: 512, purpose: null },
    { src: '/pwa/icon-maskable-512.png', size: 512, purpose: 'maskable' },
  ]

  for (const requiredIcon of requiredIcons) {
    const icon = icons.find((item) => item.src === requiredIcon.src)
    assert(Boolean(icon), `Manifest icon ${requiredIcon.src} is missing`)
    if (!icon) continue
    assert(icon.type === 'image/png', `${requiredIcon.src} must be image/png`)
    assert(icon.sizes === `${requiredIcon.size}x${requiredIcon.size}`, `${requiredIcon.src} must declare ${requiredIcon.size}x${requiredIcon.size}`)
    if (requiredIcon.purpose) assert(icon.purpose === requiredIcon.purpose, `${requiredIcon.src} must be ${requiredIcon.purpose}`)

    const filePath = join(publicDir, requiredIcon.src.replace(/^\//, ''))
    assert(existsSync(filePath), `${filePath} is missing`)
    if (existsSync(filePath)) {
      const size = pngSize(filePath)
      assert(size?.width === requiredIcon.size && size?.height === requiredIcon.size, `${filePath} must be ${requiredIcon.size}x${requiredIcon.size}`)
    }
  }
}

if (existsSync(swPath)) {
  const sw = readFileSync(swPath, 'utf8')
  assert(sw.includes('precacheAndRoute'), 'Service worker must include a precache manifest')
  assert(!sw.includes('index.html'), 'Service worker must not reference missing index.html navigation fallback')
  assert(sw.includes('manifest.json'), 'Service worker must precache manifest.json')
}

if (failures.length) {
  console.error('PWA verification failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('PWA verification passed')
