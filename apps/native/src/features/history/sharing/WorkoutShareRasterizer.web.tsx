import { useEffect } from 'react'
import { prepareWebImage } from './browser-image.web'
import type { RasterizerProps } from './workout-image'

export function WorkoutShareRasterizer({ svg, filename, requestKey, controller }: RasterizerProps) {
  useEffect(() => {
    void controller.generate(requestKey, () => prepareWebImage(svg, filename))
    return () => controller.cancel()
  }, [controller, svg, filename, requestKey])
  return null
}
