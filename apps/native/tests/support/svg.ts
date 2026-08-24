import { createElement, type ReactNode } from 'react'

/**
 * react-native-svg cannot be loaded under Vitest: its package entry is raw
 * TypeScript, and its prebuilt web build still deep-imports Flow-typed
 * `react-native` internals that no alias can redirect. Metro handles both; Vitest
 * does not.
 *
 * Mapping each primitive to its DOM equivalent puts the test boundary in the
 * right place — react-native-svg's rendering is not our code, but the geometry
 * we hand it is. Assertions read the `d`, `cx`/`cy`, and text content we produce.
 *
 * Use at module scope in any test rendering a chart or BarbellPlates:
 *   vi.mock('react-native-svg', () => svgMock())
 */
type AnyProps = { children?: ReactNode } & Record<string, unknown>

// createElement rather than `<Tag />`: a dynamic tag name has no intrinsic type.
const passthrough = (tag: string) =>
  function SvgPrimitive({ children, ...props }: AnyProps) {
    return createElement(tag, props, children)
  }

export function svgMock() {
  const Svg = passthrough('svg')
  return {
    default: Svg,
    Svg,
    Circle: passthrough('circle'),
    Ellipse: passthrough('ellipse'),
    G: passthrough('g'),
    Line: passthrough('line'),
    Path: passthrough('path'),
    Polygon: passthrough('polygon'),
    Rect: passthrough('rect'),
    Text: passthrough('text'),
    TSpan: passthrough('tspan'),
  }
}
