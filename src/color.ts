// Pure color math for Tzeva. No UI code.
// Conventions: h in degrees 0–360, s and b in 0–1, rgb channels in 0–255.
// Wheel angle is measured from the top, clockwise.

export type Rgb = { r: number; g: number; b: number }
export type Hsb = { h: number; s: number; b: number }
export type Point = { x: number; y: number }
export type WheelModel = 'rgb' | 'ryb'
export type HarmonyType =
  | 'complementary'
  | 'split'
  | 'analogous'
  | 'triadic'
  | 'tetradic'

export const HARMONY_OFFSETS: Record<HarmonyType, number[]> = {
  complementary: [180],
  split: [150, 210],
  analogous: [-30, 30],
  triadic: [120, 240],
  tetradic: [90, 180, 270],
}

export const SEGMENT_SLICES = 12
export const SEGMENT_RINGS = 5

const mod360 = (a: number) => ((a % 360) + 360) % 360
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export function hsbToRgb(h: number, s: number, b: number): Rgb {
  const hh = mod360(h) / 60
  const c = b * s
  const x = c * (1 - Math.abs((hh % 2) - 1))
  const m = b - c
  let r = 0
  let g = 0
  let bl = 0
  if (hh < 1) [r, g, bl] = [c, x, 0]
  else if (hh < 2) [r, g, bl] = [x, c, 0]
  else if (hh < 3) [r, g, bl] = [0, c, x]
  else if (hh < 4) [r, g, bl] = [0, x, c]
  else if (hh < 5) [r, g, bl] = [x, 0, c]
  else [r, g, bl] = [c, 0, x]
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((bl + m) * 255),
  }
}

/** Hue is 0 for grays; callers keep the previous hue in that case. */
export function rgbToHsb(r: number, g: number, b: number): Hsb {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h = mod360(h * 60)
  }
  return { h, s: max === 0 ? 0 : d / max, b: max }
}

export function rgbToHex(r: number, g: number, b: number): string {
  const part = (v: number) =>
    Math.min(255, Math.max(0, Math.round(v)))
      .toString(16)
      .padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase()
}

/** Accepts #RRGGBB, RRGGBB, #RGB, RGB (case-insensitive). Null if invalid. */
export function parseHex(str: string): Rgb | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(str.trim())
  if (!m) return null
  let hex = m[1]
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join('')
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  }
}

/** Wheel angle -> hue for the given wheel model (identity for rgb). */
const RYB_ANGLES = [0, 60, 120, 180, 240, 300, 360]
const RYB_HUES = [0, 30, 60, 120, 240, 270, 360]

function piecewise(v: number, from: number[], to: number[]): number {
  const x = mod360(v)
  for (let i = 0; i < from.length - 1; i++) {
    if (x <= from[i + 1]) {
      const t = (x - from[i]) / (from[i + 1] - from[i])
      return to[i] + t * (to[i + 1] - to[i])
    }
  }
  return to[to.length - 1]
}

export const rybAngleToHue = (a: number) => mod360(piecewise(a, RYB_ANGLES, RYB_HUES))
export const hueToRybAngle = (h: number) => mod360(piecewise(h, RYB_HUES, RYB_ANGLES))

export const angleToHue = (a: number, wheel: WheelModel) =>
  wheel === 'ryb' ? rybAngleToHue(a) : mod360(a)
export const hueToAngle = (h: number, wheel: WheelModel) =>
  wheel === 'ryb' ? hueToRybAngle(h) : mod360(h)

/** Touch point -> wheel angle and saturation (clamped to 1). */
export function pointToAngleSat(
  x: number,
  y: number,
  center: Point,
  radius: number,
): { angle: number; s: number } {
  const dx = x - center.x
  const dy = center.y - y
  return {
    angle: mod360((Math.atan2(dx, dy) * 180) / Math.PI),
    s: Math.min(1, Math.hypot(dx, dy) / radius),
  }
}

/** Touch point -> hue and saturation. */
export function pointToHS(
  x: number,
  y: number,
  center: Point,
  radius: number,
  wheel: WheelModel = 'rgb',
): { h: number; s: number } {
  const { angle, s } = pointToAngleSat(x, y, center, radius)
  return { h: angleToHue(angle, wheel), s }
}

/** Hue and saturation -> marker position. */
export function hsToPoint(
  h: number,
  s: number,
  center: Point,
  radius: number,
  wheel: WheelModel = 'rgb',
): Point {
  const a = (hueToAngle(h, wheel) * Math.PI) / 180
  const r = clamp01(s) * radius
  return { x: center.x + r * Math.sin(a), y: center.y - r * Math.cos(a) }
}

/** Hues of the harmony colors. Offsets apply to the RYB angle in ryb mode. */
export function harmonies(
  h: number,
  type: HarmonyType,
  wheel: WheelModel = 'rgb',
): number[] {
  const base = hueToAngle(h, wheel)
  return HARMONY_OFFSETS[type].map((o) => angleToHue(base + o, wheel))
}

/** Segmented mode: slices are centered on 0°, 30°, 60°... */
export function snapAngle(angle: number): number {
  const step = 360 / SEGMENT_SLICES
  return mod360(Math.round(angle / step) * step)
}

/** Segmented mode: rings are equal-width bands; snap to the band center. */
export function snapSat(s: number): number {
  const i = Math.min(SEGMENT_RINGS - 1, Math.floor(clamp01(s) * SEGMENT_RINGS))
  return (i + 0.5) / SEGMENT_RINGS
}

/** Convenience: hsb -> "#RRGGBB". */
export function hsbToHex(h: number, s: number, b: number): string {
  const { r, g, b: bl } = hsbToRgb(h, s, b)
  return rgbToHex(r, g, bl)
}

/**
 * Hex -> Hsb, keeping the previous hue when hue is undefined
 * (saturation or brightness is 0). Null if the hex is invalid.
 */
export function hexToHsbKeepHue(hex: string, prev: Hsb): Hsb | null {
  const rgb = parseHex(hex)
  if (!rgb) return null
  const hsb = rgbToHsb(rgb.r, rgb.g, rgb.b)
  if (hsb.s === 0 || hsb.b === 0) hsb.h = prev.h
  return hsb
}
