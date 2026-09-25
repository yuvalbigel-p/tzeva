import { useRef, type PointerEvent, type ReactNode } from 'react'
import { CopyIcon } from './icons'

const LONG_PRESS_MS = 450
const MOVE_TOLERANCE = 8

type Props = {
  color: string
  /** Text/input shown in the field. */
  children: ReactNode
  hex: string
  onCopy: (hex: string) => void
  /** Long-pressing the swatch selects this color (harmony rows only). */
  onSwatchLongPress?: () => void
}

/** Swatch + hex field with a copy icon at its end. Shared by the main row and harmony rows. */
export function ColorRow({ color, children, hex, onCopy, onSwatchLongPress }: Props) {
  const timer = useRef(0)
  const start = useRef({ x: 0, y: 0 })

  const cancel = () => window.clearTimeout(timer.current)
  const down = (e: PointerEvent) => {
    if (!onSwatchLongPress) return
    start.current = { x: e.clientX, y: e.clientY }
    timer.current = window.setTimeout(onSwatchLongPress, LONG_PRESS_MS)
  }
  const move = (e: PointerEvent) => {
    if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > MOVE_TOLERANCE) cancel()
  }

  return (
    <div className="color-row">
      <div
        className={`swatch${onSwatchLongPress ? ' pressable' : ''}`}
        style={{ background: color }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={cancel}
        onPointerCancel={cancel}
        onPointerLeave={cancel}
        onContextMenu={(e) => e.preventDefault()}
      />
      <div className="hex-field">
        {children}
        <button type="button" className="icon-btn" aria-label={`Copy ${hex}`} onClick={() => onCopy(hex)}>
          <CopyIcon />
        </button>
      </div>
    </div>
  )
}
