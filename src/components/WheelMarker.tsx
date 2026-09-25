import { useRef, useState, type PointerEvent } from 'react'
import {
  angleToHue,
  hsbToHex,
  hsToPoint,
  pointToAngleSat,
  snapAngle,
  snapSat,
} from '../color'
import type { State } from '../state'

const UNIT_CENTER = { x: 0.5, y: 0.5 }

type Props = {
  state: State
  /** Harmony hues to show as dots, or null when the Harmonies view is closed. */
  dots: number[] | null
  onChange: (h: number, s: number) => void
  onPickDot: (index: number) => void
}

/** Marker, harmony dots and pointer handling, overlaid on the canvas. */
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

  const pos = (hue: number, sat: number) => {
    const p = hsToPoint(hue, sat, UNIT_CENTER, 0.5, wheel)
    return { left: `${p.x * 100}%`, top: `${p.y * 100}%` }
  }

  const marker = pos(h, s)
  const hex = hsbToHex(h, s, b)
  const bubbleBelow = hsToPoint(h, s, UNIT_CENTER, 0.5, wheel).y < 0.18

  return (
    <div
      ref={ref}
      className="wheel-touch"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {dots?.map((dh, i) => (
        <button
          key={i}
          type="button"
          className="harmony-dot"
          style={{ ...pos(dh, s), ['--dot' as string]: hsbToHex(dh, s, b) }}
          aria-label={`Select harmony color ${hsbToHex(dh, s, b)}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onPickDot(i)}
        />
      ))}
      <div className="marker" style={{ ...marker, ['--marker' as string]: hex }} />
      {dragging && (
        <div className={`bubble${bubbleBelow ? ' below' : ''}`} style={marker}>
          <span className="bubble-swatch" style={{ background: hex }} />
          <span>{hex}</span>
        </div>
      )}
    </div>
  )
}
