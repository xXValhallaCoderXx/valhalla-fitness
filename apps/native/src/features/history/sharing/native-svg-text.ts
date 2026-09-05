const xmlEntities: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
}

/**
 * SvgXml preserves XML entities literally. Decode only the text nodes produced
 * by our renderer, then wrap them in CDATA so names never become SVG markup.
 * Decode once: an exercise actually named "&amp;" must keep that literal name.
 */
export function nativeWorkoutShareSvg(svg: string): string {
  return svg.replace(/(<text\b[^>]*>)([^<]*)(<\/text>)/g, (_match, open: string, value: string, close: string) => {
    const text = value.replace(/&(amp|lt|gt|quot|apos);/g, (_entity, name: string) => xmlEntities[name])
    return `${open}<![CDATA[${text.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>${close}`
  })
}
