import { describe, expect, it } from 'vitest'
import { average3x3, downscaleSize, screenToImage } from './photoColor'

describe('downscaleSize', () => {
  it('leaves an already-small size unchanged', () => {
    expect(downscaleSize(800, 600)).toEqual({ width: 800, height: 600 })
  })
  it('never upscales', () => {
    expect(downscaleSize(100, 50, 2048)).toEqual({ width: 100, height: 50 })
  })
  it('scales a landscape photo so the longest side hits the max', () => {
    expect(downscaleSize(4032, 3024, 2048)).toEqual({ width: 2048, height: 1536 })
  })
  it('scales a portrait photo so the longest side hits the max', () => {
    expect(downscaleSize(3024, 4032, 2048)).toEqual({ width: 1536, height: 2048 })
  })
  it('leaves an exact-fit size unchanged', () => {
    expect(downscaleSize(2048, 1024, 2048)).toEqual({ width: 2048, height: 1024 })
  })
  it('never rounds a dimension down to zero', () => {
    const { width, height } = downscaleSize(1, 10000, 2048)
    expect(width).toBeGreaterThanOrEqual(1)
    expect(height).toBe(2048)
  })
})

/** width x height image; r = rFn(x, y), g = b = 0, alpha = 255. */
function makeImage(width: number, height: number, rFn: (x: number, y: number) => number) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      data[i] = rFn(x, y)
      data[i + 3] = 255
    }
  return data
}

describe('average3x3', () => {
  it('averages a uniform block to its own color', () => {
    const data = makeImage(5, 5, () => 0)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 10
      data[i + 1] = 20
      data[i + 2] = 30
    }
    expect(average3x3(data, 5, 5, 2, 2)).toEqual({ r: 10, g: 20, b: 30 })
  })

  it('averages 9 distinct pixels away from any edge', () => {
    // r-values 0..80 in steps of 10, row-major; mean of 0..80 is 40.
    const data = makeImage(3, 3, (x, y) => (y * 3 + x) * 10)
    expect(average3x3(data, 3, 3, 1, 1)).toEqual({ r: 40, g: 0, b: 0 })
  })

  it('clamps at the top-left corner instead of reading out of bounds', () => {
    const data = makeImage(3, 3, (x, y) => (y * 3 + x) * 10)
    // Clamped neighbors duplicate edge pixels: (0,0)x4, (1,0)x2, (0,1)x2, (1,1)x1 -> 120/9.
    expect(average3x3(data, 3, 3, 0, 0)).toEqual({ r: 13, g: 0, b: 0 })
  })

  it('clamps at the bottom-right corner instead of reading out of bounds', () => {
    const data = makeImage(3, 3, (x, y) => (y * 3 + x) * 10)
    // (1,1)x1, (2,1)x2, (1,2)x2, (2,2)x4 -> 600/9.
    expect(average3x3(data, 3, 3, 2, 2)).toEqual({ r: 67, g: 0, b: 0 })
  })
})

describe('screenToImage', () => {
  it('maps 1:1 when the image exactly fills the container', () => {
    const rect = { left: 0, top: 0, width: 200, height: 100 }
    expect(screenToImage(50, 25, rect, 200, 100)).toEqual({ x: 50, y: 25 })
    expect(screenToImage(0, 0, rect, 200, 100)).toEqual({ x: 0, y: 0 })
  })

  it('accounts for pillarboxing (container wider than the image)', () => {
    const rect = { left: 0, top: 0, width: 300, height: 100 }
    // 100x100 image at scale 1, centered: occupies x in [100, 200].
    expect(screenToImage(150, 50, rect, 100, 100)).toEqual({ x: 50, y: 50 })
    expect(screenToImage(100, 0, rect, 100, 100)).toEqual({ x: 0, y: 0 })
  })

  it('clamps points that land in the letterbox margin', () => {
    const rect = { left: 0, top: 0, width: 300, height: 100 }
    expect(screenToImage(0, 50, rect, 100, 100)).toEqual({ x: 0, y: 50 })
    expect(screenToImage(300, 50, rect, 100, 100)).toEqual({ x: 99, y: 50 })
  })

  it('accounts for letterboxing (container taller than the image)', () => {
    const rect = { left: 0, top: 0, width: 100, height: 300 }
    // 100x50 image at scale 1, centered: occupies y in [125, 175].
    expect(screenToImage(50, 125, rect, 100, 50)).toEqual({ x: 50, y: 0 })
    expect(screenToImage(50, 0, rect, 100, 50)).toEqual({ x: 50, y: 0 })
    expect(screenToImage(50, 299, rect, 100, 50)).toEqual({ x: 50, y: 49 })
  })

  it("accounts for the container's own offset on the page", () => {
    const rect = { left: 50, top: 20, width: 200, height: 100 }
    expect(screenToImage(150, 70, rect, 200, 100)).toEqual({ x: 100, y: 50 })
  })
})
