import {
  SEGMENT_RINGS,
  SEGMENT_SLICES,
  angleToHue,
  hsbToRgb,
  snapAngle,
  snapSat,
  type WheelModel,
} from './color'
import type { ViewMode } from './state'

type Geometry = { size: number; angle: Float32Array; sat: Float32Array; alpha: Uint8ClampedArray }
let cached: Geometry | null = null

/** Per-pixel angle / saturation / edge alpha; depends only on canvas size. */
function geometry(size: number): Geometry {
  if (cached?.size === size) return cached
  const angle = new Float32Array(size * size)
  const sat = new Float32Array(size * size)
  const alpha = new Uint8ClampedArray(size * size)
  const R = size / 2
  for (let y = 0; y < size; y++) {
    const dy = R - (y + 0.5)
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - R
      const dist = Math.hypot(dx, dy)
      const i = y * size + x
      let a = (Math.atan2(dx, dy) * 180) / Math.PI
      if (a < 0) a += 360
      angle[i] = a
      sat[i] = Math.min(1, dist / R)
      alpha[i] = Math.min(1, Math.max(0, R - dist + 0.5)) * 255
    }
  }
  cached = { size, angle, sat, alpha }
  return cached
}

/** Draws the wheel into a square canvas whose width/height are already set. */
export function drawWheel(
  canvas: HTMLCanvasElement,
  brightness: number,
  mode: ViewMode,
  wheel: WheelModel,
  borderColor: string,
) {
  const size = canvas.width
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { angle, sat, alpha } = geometry(size)
  const img = ctx.createImageData(size, size)
  const data = img.data
  const segmented = mode === 'segmented'
  for (let i = 0; i < size * size; i++) {
    if (alpha[i] === 0) continue
    const a = segmented ? snapAngle(angle[i]) : angle[i]
    const s = segmented ? snapSat(sat[i]) : sat[i]
    const { r, g, b } = hsbToRgb(angleToHue(a, wheel), s, brightness)
    const j = i * 4
    data[j] = r
    data[j + 1] = g
    data[j + 2] = b
    data[j + 3] = alpha[i]
  }
  ctx.putImageData(img, 0, 0)

  if (segmented) {
    const R = size / 2
    ctx.strokeStyle = borderColor
    ctx.lineWidth = Math.max(2, size / 200)
    ctx.beginPath()
    for (let k = 0; k < SEGMENT_SLICES; k++) {
      const a = (((k + 0.5) * 360) / SEGMENT_SLICES) * (Math.PI / 180)
      ctx.moveTo(R, R)
      ctx.lineTo(R + R * Math.sin(a), R - R * Math.cos(a))
    }
    for (let i = 1; i < SEGMENT_RINGS; i++) {
      ctx.moveTo(R + (R * i) / SEGMENT_RINGS, R)
      ctx.arc(R, R, (R * i) / SEGMENT_RINGS, 0, Math.PI * 2)
    }
    ctx.stroke()
  }
}
