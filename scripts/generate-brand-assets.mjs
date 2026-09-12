import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = fileURLToPath(new URL('../', import.meta.url))
const master = await readFile(resolve(root, 'assets/branding/sheetless-mark.svg'))
const teal = '#197f9a'

async function write(path, data) {
  const output = resolve(root, path)
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, data)
  console.log(path)
}

// Check the actual rendered alpha, including antialiasing, before exporting.
const { data, info } = await sharp(master).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
if (info.width !== 1024 || info.height !== 1024) throw new Error('Master must be 1024 × 1024')
let left = info.width
let top = info.height
let right = 0
let bottom = 0
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] === 0) continue
    if (Math.hypot(x + 0.5 - 512, y + 0.5 - 512) > 300) {
      throw new Error('Sheetless mark exceeds the Android 600px safe circle')
    }
    left = Math.min(left, x)
    top = Math.min(top, y)
    right = Math.max(right, x)
    bottom = Math.max(bottom, y)
  }
}
if (right < left) throw new Error('Sheetless mark is empty')

const foreground = await sharp(master).png().toBuffer()
const mark = await sharp(foreground)
  .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
  .png().toBuffer()

async function icon(size, scale = 1.25) {
  // Opaque icons use a larger mark; maskable remains inside its 80% safe circle.
  const expanded = master.toString().replace('<g ', `<g transform="translate(512 512) scale(${scale}) translate(-512 -512)"><g `)
    .replace('</g>', '</g></g>')
  return sharp(Buffer.from(expanded)).resize(size, size).flatten({ background: teal }).png().toBuffer()
}

await write('apps/native/assets/images/icon.png', await icon(1024))
for (const name of ['android-icon-foreground', 'android-icon-monochrome', 'splash-icon']) {
  await write(`apps/native/assets/images/${name}.png`, foreground)
}
await write('apps/native/assets/images/sheetless-mark.png', mark)
await write('apps/web/src/assets/sheetless-mark.png', mark)
for (const size of [192, 512]) {
  await write(`apps/web/public/pwa/icon-${size}.png`, await icon(size))
}
await write('apps/web/public/pwa/icon-maskable-512.png', await icon(512))
await write('apps/web/public/pwa/apple-touch-icon.png', await icon(180))
const favicon = await icon(32, 1.4)
await write('apps/web/public/favicon.png', favicon)
await write('apps/native/assets/images/favicon.png', favicon)
