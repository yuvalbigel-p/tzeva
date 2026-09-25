import { useEffect, useRef } from 'react'
import type { WheelModel } from '../color'
import type { ViewMode } from '../state'
import { drawWheel } from '../wheelRender'

const BORDER = '#1e1e1e'

/** Canvas wheel. Redraws only when brightness, mode, wheel model or size changes. */
export function ColorWheel({ b, mode, wheel }: { b: number; mode: ViewMode; wheel: WheelModel }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let frame = 0
    const draw = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const size = Math.round(canvas.clientWidth * (window.devicePixelRatio || 1))
        if (!size) return
        canvas.width = size
        canvas.height = size
        drawWheel(canvas, b, mode, wheel, BORDER)
      })
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
    }
  }, [b, mode, wheel])

  return <canvas ref={ref} className="wheel-canvas" aria-hidden="true" />
}
