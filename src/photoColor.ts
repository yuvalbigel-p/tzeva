// Pure math for the photo color picker. No UI or canvas code, so it can be
// unit-tested on its own.

import type { Rgb } from './color'

/** A DOM rect's useful fields, without requiring a real DOMRect in tests. */
export type Rect = { left: number; top: number; width: number; height: number }

/**
 * Scales width/height down so the longest side is at most maxSide, preserving
 * aspect ratio. Never upscales: an already-small size is returned unchanged.
 */
export function downscaleSize(
  width: number,
  height: number,
  maxSide = 2048,
): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxSide) return { width, height }
  const scale = maxSide / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/**
 * Averages the 3×3 pixel block centered on (x, y). Out-of-bounds neighbors are
 * clamped to the nearest edge pixel (rather than skipped), so a corner or edge
 * pixel still averages 9 samples, some of them repeated.
 */
export function average3x3(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): Rgb {
  let r = 0
  let g = 0
  let b = 0
  for (let dy = -1; dy <= 1; dy++) {
    const sy = Math.min(height - 1, Math.max(0, y + dy))
    for (let dx = -1; dx <= 1; dx++) {
      const sx = Math.min(width - 1, Math.max(0, x + dx))
      const i = (sy * width + sx) * 4
      r += data[i]
      g += data[i + 1]
      b += data[i + 2]
    }
  }
  return { r: Math.round(r / 9), g: Math.round(g / 9), b: Math.round(b / 9) }
}

/**
 * Maps a screen point to an image pixel coordinate, for an image shown in
 * `rect` with `object-fit: contain` (scaled to fit, centered, letterboxed).
 * Points in the letterbox margin, or otherwise outside the image, are
 * clamped to the nearest edge pixel rather than returning an out-of-range or
 * negative coordinate.
 */
export function screenToImage(
  clientX: number,
  clientY: number,
  rect: Rect,
  imgWidth: number,
  imgHeight: number,
): { x: number; y: number } {
  const scale = Math.min(rect.width / imgWidth, rect.height / imgHeight)
  if (!isFinite(scale) || scale <= 0) return { x: 0, y: 0 }
  const displayedW = imgWidth * scale
  const displayedH = imgHeight * scale
  const offsetX = rect.left + (rect.width - displayedW) / 2
  const offsetY = rect.top + (rect.height - displayedH) / 2
  const x = (clientX - offsetX) / scale
  const y = (clientY - offsetY) / scale
  return {
    x: Math.min(imgWidth - 1, Math.max(0, Math.round(x))),
    y: Math.min(imgHeight - 1, Math.max(0, Math.round(y))),
  }
}
