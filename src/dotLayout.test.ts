import { describe, expect, it } from 'vitest'
import { spreadOverlaps, type DotPoint } from './dotLayout'

const pt = <T,>(x: number, y: number, data: T): DotPoint<T> => ({ x, y, data })
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

describe('spreadOverlaps', () => {
  it('leaves non-overlapping points unchanged', () => {
    const points = [pt(0.2, 0.3, 'a'), pt(0.7, 0.1, 'b'), pt(0.5, 0.5, 'c')]
    expect(spreadOverlaps(points)).toEqual(points)
  })

  it('preserves order, length and data', () => {
    const points = [pt(0.4, 0.4, 'a'), pt(0.4, 0.4, 'b'), pt(0.9, 0.9, 'c')]
    const out = spreadOverlaps(points)
    expect(out.length).toBe(3)
    expect(out.map((p) => p.data)).toEqual(['a', 'b', 'c'])
    expect(out[2]).toEqual(points[2]) // isolated point untouched
  })

  it('spreads two coincident points apart, equidistant from the original spot', () => {
    const base = pt(0.4, 0.4, 'a')
    const out = spreadOverlaps([base, pt(0.4, 0.4, 'b')], 1e-6, 0.05)
    expect(dist(out[0], base)).toBeCloseTo(0.05, 6)
    expect(dist(out[1], base)).toBeCloseTo(0.05, 6)
    expect(dist(out[0], out[1])).toBeGreaterThan(0.09) // not back on top of each other
  })

  it('spreads three coincident points into an equilateral arrangement', () => {
    const base = pt(0.5, 0.5, 0)
    const out = spreadOverlaps([base, pt(0.5, 0.5, 1), pt(0.5, 0.5, 2)], 1e-6, 0.04)
    for (const p of out) expect(dist(p, base)).toBeCloseTo(0.04, 6)
    expect(dist(out[0], out[1])).toBeCloseTo(dist(out[1], out[2]), 6)
    expect(dist(out[1], out[2])).toBeCloseTo(dist(out[0], out[2]), 6)
  })

  it('groups only points within epsilon of each other', () => {
    const near = pt(0.400001, 0.4, 'b')
    const far = pt(0.6, 0.4, 'c')
    const out = spreadOverlaps([pt(0.4, 0.4, 'a'), near, far], 1e-3, 0.05)
    expect(out[2]).toEqual(far) // far point untouched
    expect(dist(out[0], out[1])).toBeGreaterThan(0) // the near pair got spread
  })

  it('clamps spread points back inside the wheel near the rim', () => {
    const rim = pt(0.5, 0.0, 'a') // top rim, distance 0.5 from center
    const out = spreadOverlaps([rim, pt(0.5, 0.0, 'b')], 1e-6, 0.08)
    for (const p of out) expect(Math.hypot(p.x - 0.5, p.y - 0.5)).toBeLessThanOrEqual(0.5 + 1e-9)
  })
})
