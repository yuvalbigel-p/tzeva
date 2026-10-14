// Pure geometry for spreading out wheel dots that land on the same spot.
// No UI code; operates on points already computed by color.ts (hsToPoint).

export type DotPoint<T> = { x: number; y: number; data: T }

const CENTER = { x: 0.5, y: 0.5 }
const MAX_R = 0.5

/**
 * Spreads out points that land at (or within `epsilon` of) the same spot, on a
 * small circle of radius `offset` around that spot, so every dot stays visible
 * and tappable. Points are in the wheel's unit square (center 0.5, 0.5; rim at
 * distance 0.5), and the result is clamped back inside the wheel. A point with
 * no near neighbor is returned unchanged. Order and length are preserved.
 */
export function spreadOverlaps<T>(
  points: DotPoint<T>[],
  epsilon = 1e-6,
  offset = 0.045,
): DotPoint<T>[] {
  const groups: number[][] = []
  const seen = new Array(points.length).fill(false)
  for (let i = 0; i < points.length; i++) {
    if (seen[i]) continue
    const group = [i]
    seen[i] = true
    for (let j = i + 1; j < points.length; j++) {
      if (seen[j]) continue
      if (Math.hypot(points[j].x - points[i].x, points[j].y - points[i].y) <= epsilon) {
        group.push(j)
        seen[j] = true
      }
    }
    groups.push(group)
  }

  const out = points.slice()
  for (const group of groups) {
    if (group.length < 2) continue
    const base = points[group[0]]
    for (let k = 0; k < group.length; k++) {
      const angle = (2 * Math.PI * k) / group.length
      let x = base.x + offset * Math.sin(angle)
      let y = base.y - offset * Math.cos(angle)
      const dx = x - CENTER.x
      const dy = y - CENTER.y
      const dist = Math.hypot(dx, dy)
      if (dist > MAX_R) {
        const scale = MAX_R / dist
        x = CENTER.x + dx * scale
        y = CENTER.y + dy * scale
      }
      out[group[k]] = { ...points[group[k]], x, y }
    }
  }
  return out
}
