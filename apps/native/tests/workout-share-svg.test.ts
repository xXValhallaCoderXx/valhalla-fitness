import { describe, expect, it, vi } from 'vitest'
import { nativeWorkoutShareSvg } from '@/features/history/sharing/native-svg-text'

// Exercise the real XML parser without loading any native SVG components.
vi.mock('react-native-svg/src/xmlTags', () => ({ tags: { svg: 'svg', text: 'text', rect: 'rect' } }))

type NativeXmlNode = { children: (NativeXmlNode | string)[] }
// Loading through Vitest keeps this runtime-only dependency probe from pulling
// react-native-svg's raw native implementation into the app's TypeScript check.
const { parse } = await vi.importActual<{
  parse: (source: string, middleware: (root: NativeXmlNode) => NativeXmlNode) => unknown
}>('react-native-svg/src/xml')

function parsedText(svg: string) {
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
  expect(document.querySelector('parsererror')).toBeNull()
  return { document, text: document.querySelector('text')?.textContent }
}

function nativeText(svg: string) {
  let text = ''
  parse(svg, (root) => {
    const visit = (node: NativeXmlNode | string) => {
      if (typeof node === 'string') text += node
      else node.children.forEach(visit)
    }
    visit(root)
    return root
  })
  return text
}

describe('native SVG text adaptation', () => {
  it('passes actual punctuation to SvgXml without changing artwork or attributes', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#081114"/><text x="64" fill="#fff">A &amp; B&apos;s &quot;pull&quot; &lt; 10 &gt; 2</text></svg>'
    const native = nativeWorkoutShareSvg(svg)
    expect(native).toContain('<rect fill="#081114"/>')
    expect(native).toContain('<text x="64" fill="#fff"><![CDATA[A & B\'s "pull" < 10 > 2]]></text>')
    expect(parsedText(native).text).toBe(parsedText(svg).text)
    expect(nativeText(native)).toBe(parsedText(svg).text)
  })

  it('keeps literal entities and Unicode names unchanged after one decode', () => {
    const svg = '<svg><text>杠铃 🏋🏽‍♀️ &amp;amp; &amp;#60; &amp;quot;</text></svg>'
    expect(parsedText(nativeWorkoutShareSvg(svg)).text).toBe('杠铃 🏋🏽‍♀️ &amp; &#60; &quot;')
    expect(nativeText(nativeWorkoutShareSvg(svg))).toBe(parsedText(svg).text)
  })

  it('keeps text that resembles XML or a CDATA terminator inside text nodes', () => {
    const svg = '<svg><text>]]&gt;&lt;image href=&quot;https://example.com&quot;/&gt;</text></svg>'
    const native = nativeWorkoutShareSvg(svg)
    const { document, text } = parsedText(native)
    expect(text).toBe(']]><image href="https://example.com"/>')
    expect(document.querySelector('image')).toBeNull()
    expect(native).toContain(']]]]><![CDATA[>')
    expect(nativeText(native)).toBe(text)
  })
})
