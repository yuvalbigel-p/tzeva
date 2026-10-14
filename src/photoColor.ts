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
 * The size an image renders at when fit into a container with
 * `object-fit: contain` (scaled to fit, preserving aspect ratio). Centering
 * it within the container is left to layout (flexbox centering), not to
 * this math, since `<canvas>` support for the CSS `object-fit` property is
 * unreliable across engines — see `screenToImage`.
 */
export function containRect(
  containerWidth: number,
  containerHeight: number,
  imgWidth: number,
  imgHeight: number,
): { width: number; height: number } {
  const scale = Math.min(containerWidth / imgWidth, containerHeight / imgHeight)
  if (!isFinite(scale) || scale <= 0) return { width: 0, height: 0 }
  return { width: imgWidth * scale, height: imgHeight * scale }
}

/**
 * Maps a screen point to an image pixel coordinate, for an image shown in
 * `rect` with `object-fit: contain` (scaled to fit, centered, letterboxed).
 * `inBounds` is false when the point falls outside the image itself (in the
 * letterbox margin, or anywhere else in `rect`); `x`/`y` are still clamped
 * to the nearest edge pixel in that case, for callers that want a sane
 * fallback, but callers that must not sample outside the photo (the loupe)
 * should check `inBounds` instead of relying on the clamp.
 */
export function screenToImage(
  clientX: number,
  clientY: number,
  rect: Rect,
  imgWidth: number,
  imgHeight: number,
): { x: number; y: number; inBounds: boolean } {
  const scale = Math.min(rect.width / imgWidth, rect.height / imgHeight)
  if (!isFinite(scale) || scale <= 0) return { x: 0, y: 0, inBounds: false }
  const displayedW = imgWidth * scale
  const displayedH = imgHeight * scale
  const offsetX = rect.left + (rect.width - displayedW) / 2
  const offsetY = rect.top + (rect.height - displayedH) / 2
  const rawX = (clientX - offsetX) / scale
  const rawY = (clientY - offsetY) / scale
  const inBounds = rawX >= 0 && rawX < imgWidth && rawY >= 0 && rawY < imgHeight
  return {
    x: Math.min(imgWidth - 1, Math.max(0, Math.round(rawX))),
    y: Math.min(imgHeight - 1, Math.max(0, Math.round(rawY))),
    inBounds,
  }
}
