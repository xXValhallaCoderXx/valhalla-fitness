import { useEffect, useRef } from 'react'
import { PixelRatio, Platform, View } from 'react-native'
import Svg, { SvgXml } from 'react-native-svg'
import { prepareNativeImage } from './native-image'
import { nativeWorkoutShareSvg } from './native-svg-text'
import type { RasterizerProps } from './workout-image'

export function WorkoutShareRasterizer({ svg, filename, requestKey, controller, previewVisible }: RasterizerProps) {
  const svgRef = useRef<Svg>(null)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void controller.generate(requestKey, () => {
        if (!svgRef.current) return Promise.reject(new Error('Image renderer is unavailable'))
        // iOS's UIGraphicsImageRenderer uses screen scale; Android takes pixel sizes.
        return prepareNativeImage(svgRef.current, filename, Platform.OS === 'ios' ? PixelRatio.get() : 1)
      })
    })
    return () => { cancelAnimationFrame(frame); controller.cancel() }
  }, [controller, filename, requestKey])
  return (
    // Android queues toDataURL until the SVG has actually painted. An offscreen or
    // transparent view can be culled forever; show the draft until the PNG is ready.
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ alignItems: 'center', height: previewVisible ? 270 : 0, overflow: 'hidden' }}>
      <SvgXml xml={nativeWorkoutShareSvg(svg)} override={{ ref: svgRef, width: 216, height: 270 }} />
    </View>
  )
}
