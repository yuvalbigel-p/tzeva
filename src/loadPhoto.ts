// Decodes a picked photo into a ready-to-sample canvas. DOM/canvas-dependent,
// so the pure size math it relies on lives in photoColor.ts instead.

import { downscaleSize } from './photoColor'

export type Photo = { canvas: HTMLCanvasElement; width: number; height: number }

/**
 * Loads a File into an off-screen canvas, respecting EXIF orientation and
 * downscaled so the longest side is at most 2048 px — before any canvas is
 * created, so we never allocate one at the original (possibly huge) size.
 */
export async function loadPhoto(file: File): Promise<Photo> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // Older engines may not support the option; fall back rather than fail.
    bitmap = await createImageBitmap(file)
  }
  const { width, height } = downscaleSize(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return { canvas, width, height }
}
