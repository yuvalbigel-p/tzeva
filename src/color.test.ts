import { describe, expect, it } from 'vitest'
import {
  harmonies,
  hexToHsbKeepHue,
  hsbToHex,
  hsbToRgb,
  hsToPoint,
  hueToRybAngle,
  parseHex,
  pointToHS,
  rgbToHex,
  rgbToHsb,
  rybAngleToHue,
  snapAngle,
  snapSat,
} from './color'

const C = { x: 100, y: 100 }

describe('hsbToRgb / rgbToHsb', () => {
  it('converts primaries', () => {
    expect(hsbToRgb(0, 1, 1)).toEqual({ r: 255, g: 0, b: 0 })
    expect(hsbToRgb(120, 1, 1)).toEqual({ r: 0, g: 255, b: 0 })
    expect(hsbToRgb(240, 1, 1)).toEqual({ r: 0, g: 0, b: 255 })
    expect(hsbToRgb(60, 1, 1)).toEqual({ r: 255, g: 255, b: 0 })
  })
  it('handles white, black, gray', () => {
    expect(hsbToRgb(0, 0, 1)).toEqual({ r: 255, g: 255, b: 255 })
    expect(hsbToRgb(200, 1, 0)).toEqual({ r: 0, g: 0, b: 0 })
    expect(hsbToRgb(0, 0, 0.5)).toEqual({ r: 128, g: 128, b: 128 })
  })
  it('wraps hue', () => {
    expect(hsbToRgb(360, 1, 1)).toEqual(hsbToRgb(0, 1, 1))
    expect(hsbToRgb(-120, 1, 1)).toEqual(hsbToRgb(240, 1, 1))
  })
  it('rgbToHsb inverts primaries', () => {
    expect(rgbToHsb(255, 0, 0)).toEqual({ h: 0, s: 1, b: 1 })
    expect(rgbToHsb(0, 0, 255)).toEqual({ h: 240, s: 1, b: 1 })
    expect(rgbToHsb(0, 0, 0)).toEqual({ h: 0, s: 0, b: 0 })
    expect(rgbToHsb(255, 0, 128).h).toBeCloseTo(329.88, 1)
  })
})

describe('hex', () => {
  it('formats uppercase', () => {
    expect(rgbToHex(255, 0, 170)).toBe('#FF00AA')
    expect(rgbToHex(0, 0, 0)).toBe('#000000')
  })
  it('parses accepted formats', () => {
    expect(parseHex('#FF0000')).toEqual({ r: 255, g: 0, b: 0 })
    expect(parseHex('ff0000')).toEqual({ r: 255, g: 0, b: 0 })
    expect(parseHex('#f0a')).toEqual({ r: 255, g: 0, b: 170 })
    expect(parseHex('  #AbC ')).toEqual({ r: 170, g: 187, b: 204 })
  })
  it('rejects invalid input', () => {
    for (const bad of ['', '#GGG', '#12', '#1234', '#12345', '#1234567', 'red', '##fff'])
      expect(parseHex(bad)).toBeNull()
  })
  it('round-trips every 3-bit-stepped color through hsb', () => {
    for (let r = 0; r < 256; r += 5)
      for (let g = 0; g < 256; g += 5)
        for (let b = 0; b < 256; b += 5) {
          const hsb = rgbToHsb(r, g, b)
          expect(hsbToHex(hsb.h, hsb.s, hsb.b)).toBe(rgbToHex(r, g, b))
        }
  })
})

describe('wheel geometry', () => {
  it('red is at the top rim', () => {
    const p = hsToPoint(0, 1, C, 100)
    expect(p.x).toBeCloseTo(100)
    expect(p.y).toBeCloseTo(0)
  })
  it('hue increases clockwise (90° is right)', () => {
    const p = hsToPoint(90, 1, C, 100)
    expect(p.x).toBeCloseTo(200)
    expect(p.y).toBeCloseTo(100)
  })
  it('pointToHS inverts hsToPoint', () => {
    for (const wheel of ['rgb', 'ryb'] as const)
      for (const h of [0, 33, 90, 179, 270, 359]) {
        const p = hsToPoint(h, 0.6, C, 100, wheel)
        const r = pointToHS(p.x, p.y, C, 100, wheel)
        expect(r.h).toBeCloseTo(h, 6)
        expect(r.s).toBeCloseTo(0.6, 6)
      }
  })
  it('clamps saturation at the rim', () => {
    expect(pointToHS(1000, 100, C, 100).s).toBe(1)
    expect(pointToHS(100, 100, C, 100).s).toBe(0)
  })
})

describe('RYB mapping', () => {
  it('hits the anchor points', () => {
    expect(rybAngleToHue(60)).toBeCloseTo(30)
    expect(rybAngleToHue(120)).toBeCloseTo(60)
    expect(rybAngleToHue(180)).toBeCloseTo(120)
    expect(rybAngleToHue(240)).toBeCloseTo(240)
    expect(rybAngleToHue(300)).toBeCloseTo(270)
  })
  it('is invertible', () => {
    for (let a = 0; a < 360; a += 7)
      expect(hueToRybAngle(rybAngleToHue(a))).toBeCloseTo(a, 6)
  })
})

describe('harmonies', () => {
  it('rgb offsets', () => {
    expect(harmonies(0, 'complementary')).toEqual([180])
    expect(harmonies(0, 'split')).toEqual([150, 210])
    expect(harmonies(0, 'analogous')).toEqual([330, 30])
    expect(harmonies(0, 'triadic')).toEqual([120, 240])
    expect(harmonies(0, 'tetradic')).toEqual([90, 180, 270])
    expect(harmonies(350, 'complementary')).toEqual([170])
  })
  it('red complement is cyan in rgb, green in ryb', () => {
    expect(hsbToHex(harmonies(0, 'complementary')[0], 1, 1)).toBe('#00FFFF')
    expect(hsbToHex(harmonies(0, 'complementary', 'ryb')[0], 1, 1)).toBe('#00FF00')
  })
  it('yellow complement is violet in ryb', () => {
    expect(harmonies(60, 'complementary', 'ryb')[0]).toBeCloseTo(270)
  })
})

describe('segment snapping', () => {
  it('snaps angles to 30° slice centers', () => {
    expect(snapAngle(14)).toBe(0)
    expect(snapAngle(16)).toBe(30)
    expect(snapAngle(359)).toBe(0)
  })
  it('snaps saturation to ring centers', () => {
    expect(snapSat(0)).toBeCloseTo(0.1)
    expect(snapSat(0.5)).toBeCloseTo(0.5)
    expect(snapSat(1)).toBeCloseTo(0.9)
  })
})

describe('undefined hue', () => {
  it('keeps the previous hue for grays', () => {
    const prev = { h: 200, s: 0.5, b: 0.5 }
    expect(hexToHsbKeepHue('#808080', prev).h).toBe(200)
    expect(hexToHsbKeepHue('#000000', prev).h).toBe(200)
    expect(hexToHsbKeepHue('#FF0000', prev).h).toBe(0)
  })
  it('returns null for invalid hex', () => {
    expect(hexToHsbKeepHue('nope', { h: 1, s: 1, b: 1 })).toBeNull()
  })
})
