import { useRef, useState, type PointerEvent } from 'react'
import {
  angleToHue,
  hsbToHex,
  hsToPoint,
  pointToAngleSat,
  snapAngle,
  snapSat,
} from '../color'
import { spreadOverlaps } from '../dotLayout'
import type { State } from '../state'

const UNIT_CENTER = { x: 0.5, y: 0.5 }

/** A dot shown on the wheel: its own hue/saturation (for position) and actual color (for its fill). */
export type WheelDot = {
  key: string | number
  h: number
  s: number
  hex: string
  selected?: boolean
}

type Props = {
  state: State
  /** Dots to show (harmony hues or palette colors), or null when neither view is open. */
  dots: WheelDot[] | null
  onChange: (h: number, s: number) => void
  onPickDot: (key: string | number) => void
}

/** Marker, harmony/palette dots and pointer handling, overlaid on the canvas. */
export function WheelMarker({ state, dots, onChange, onPickDot }: Props) {
  const { h, s, b, mode, wheel } = state
  const ref = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const update = (e: PointerEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const radius = rect.width / 2
    const center = { x: rect.left + radius, y: rect.top + radius }
    let { angle, s: sat } = pointToAngleSat(e.clientX, e.clientY, center, radius)
    if (mode === 'segmented') {
      angle = snapAngle(angle)
      sat = snapSat(sat)
    }
    // At the exact center the angle is undefined: keep the previous hue.
    onChange(sat === 0 ? h : angleToHue(angle, wheel), sat)
  }

  const onDown = (e: PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    update(e)
  }
  const onMove = (e: PointerEvent) => {
    if (dragging) update(e)
  }
  const onUp = () => setDragging(false)

  const pos = (hue: number, sat: number) => hsToPoint(hue, sat, UNIT_CENTER, 0.5, wheel)
  const style = (p: { x: number; y: number }) => ({ left: `${p.x * 100}%`, top: `${p.y * 100}%` })

  const marker = pos(h, s)
  const hex = hsbToHex(h, s, b)
  const bubbleBelow = marker.y < 0.18

  const dotPoints = (dots ?? []).map((d) => ({ ...pos(d.h, d.s), data: d }))
  const spread = spreadOverlaps(dotPoints)

  return (
    <div
      ref={ref}
      className="wheel-touch"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {spread.map(({ x, y, data }) => (
        <button
          key={data.key}
          type="button"
          className={`wheel-dot${data.selected ? ' selected' : ''}`}
          style={{ ...style({ x, y }), ['--dot' as string]: data.hex }}
          aria-label={`Select color ${data.hex}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onPickDot(data.key)}
        />
      ))}
      <div className="marker" style={{ ...style(marker), ['--marker' as string]: hex }} />
      {dragging && (
        <div className={`bubble${bubbleBelow ? ' below' : ''}`} style={style(marker)}>
          <span className="bubble-swatch" style={{ background: hex }} />
          <span>{hex}</span>
        </div>
      )}
    </div>
  )
}
