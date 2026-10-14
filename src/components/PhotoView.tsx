import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { rgbToHex } from '../color'
import type { Photo } from '../loadPhoto'
import { average3x3, containRect, screenToImage } from '../photoColor'
import { CloseIcon, PhotoIcon } from './icons'

const LOUPE_SIZE = 120 // CSS px: the magnified view's own size
const LOUPE_SAMPLE = 18 // source px: the region of the photo it magnifies
const LOUPE_MARGIN = 12 // keeps the loupe clear of the screen edges
const LOUPE_OFFSET = 88 // gap between the finger and the loupe

type Props = {
  photo: Photo
  onPick: (hex: string) => void
  onClose: () => void
  onChoosePhoto: () => void
}

/** Full-screen photo view: drag to preview a color with a loupe, lift to pick it. */
export function PhotoView({ photo, onPick, onClose, onChoosePhoto }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const loupeRef = useRef<HTMLCanvasElement>(null)
  const imageDataRef = useRef<ImageData | null>(null)
  const lastHex = useRef<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [inPhoto, setInPhoto] = useState(false)
  const [loupePos, setLoupePos] = useState({ x: 0, y: 0 })
  const [hex, setHex] = useState('')
  // Whether the loupe sits above or below the finger, decided once when a
  // drag starts and held for the rest of that drag. Not recomputed on every
  // move: right at the boundary, ordinary touch coordinate noise between the
  // pointerdown and the next pointermove could otherwise flip it, making the
  // loupe visibly jump from one side of the finger to the other for no
  // reason the finger actually moved. Both prior photo bugs were reported
  // while picking colors near the top of a photo - exactly where this
  // boundary sits - which is what made it noticeable.
  const [above, setAbove] = useState(true)
  // The canvas's own rendered size, computed from the wrapper's box the same
  // way `object-fit: contain` would, then applied as the canvas's actual CSS
  // size and centered by the flex wrapper. Not done with `object-fit` on the
  // canvas itself: canvas support for that property is unreliable across
  // engines (e.g. combined with flex-based resizing), which previously made
  // the sampled point drift from the finger whenever the photo was
  // letterboxed - the browser could paint the canvas stretched to fill its
  // box while our math assumed it was letterboxed inside that box, or vice
  // versa. Sizing the element itself removes that mismatch: its
  // getBoundingClientRect() is then always the true displayed image rect.
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null)

  // Draw the photo once and keep its pixels around for sampling.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = photo.width
    canvas.height = photo.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(photo.canvas, 0, 0)
    imageDataRef.current = ctx.getImageData(0, 0, photo.width, photo.height)
  }, [photo])

  // Keep the canvas's displayed size matching the wrapper's box as it
  // resizes (rotation, browser chrome showing/hiding, etc). Runs before
  // paint so the canvas never briefly flashes at its unstyled default size.
  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const recompute = () => {
      const { width, height } = wrap.getBoundingClientRect()
      setDisplaySize(containRect(width, height, photo.width, photo.height))
    }
    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [photo])

  const drawLoupe = (x: number, y: number) => {
    const ctx = loupeRef.current?.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE)
    const half = LOUPE_SAMPLE / 2
    ctx.drawImage(photo.canvas, x - half, y - half, LOUPE_SAMPLE, LOUPE_SAMPLE, 0, 0, LOUPE_SIZE, LOUPE_SIZE)
  }

  const update = (e: PointerEvent, isStart = false) => {
    const canvas = canvasRef.current
    const data = imageDataRef.current
    if (!canvas || !data) return
    const rect = canvas.getBoundingClientRect()
    const { x, y, inBounds } = screenToImage(e.clientX, e.clientY, rect, photo.width, photo.height)
    // Pointer capture keeps delivering move/up events to the canvas even once
    // the finger drags off it (e.g. into the dark letterbox bars), so this
    // can't just trust "the event landed on the canvas" - it has to check the
    // mapped point itself. Outside the photo, freeze the last valid sample
    // and hide the loupe rather than sampling the nearest edge pixel.
    setInPhoto(inBounds)
    if (!inBounds) return
    if (isStart) setAbove(e.clientY - LOUPE_OFFSET - LOUPE_SIZE > 0)
    const { r, g, b } = average3x3(data.data, photo.width, photo.height, x, y)
    const nextHex = rgbToHex(r, g, b)
    lastHex.current = nextHex
    setHex(nextHex)
    setLoupePos({ x: e.clientX, y: e.clientY })
    drawLoupe(x, y)
  }

  const onDown = (e: PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    update(e, true)
  }
  const onMove = (e: PointerEvent) => {
    if (dragging) update(e)
  }
  const onUp = () => {
    setDragging(false)
    setInPhoto(false)
    if (lastHex.current) onPick(lastHex.current)
    onClose()
  }
  const onCancel = () => {
    setDragging(false)
    setInPhoto(false)
  }

  const vw = typeof window === 'undefined' ? 0 : window.innerWidth
  const vh = typeof window === 'undefined' ? 0 : window.innerHeight
  const half = LOUPE_SIZE / 2
  const left = Math.min(vw - LOUPE_MARGIN - half, Math.max(LOUPE_MARGIN + half, loupePos.x))
  const rawTop = above ? loupePos.y - LOUPE_OFFSET - LOUPE_SIZE : loupePos.y + LOUPE_OFFSET
  const top = Math.min(vh - LOUPE_MARGIN - LOUPE_SIZE, Math.max(LOUPE_MARGIN, rawTop))

  return (
    <div className="photo-view">
      <div ref={wrapRef} className="photo-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="photo-canvas"
          style={displaySize ? { width: `${displaySize.width}px`, height: `${displaySize.height}px` } : undefined}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onCancel}
        />
      </div>
      <div className="photo-bar">
        <button type="button" className="icon-btn" aria-label="Close photo" onClick={onClose}>
          <CloseIcon />
        </button>
        <button type="button" className="icon-btn" aria-label="Choose a different photo" onClick={onChoosePhoto}>
          <PhotoIcon />
        </button>
      </div>
      {dragging && inPhoto && (
        <div className="loupe" style={{ left: `${left}px`, top: `${top}px` }}>
          <canvas ref={loupeRef} width={LOUPE_SIZE} height={LOUPE_SIZE} className="loupe-canvas" />
          <div className="loupe-crosshair" />
          <div className="loupe-hex">{hex}</div>
        </div>
      )}
    </div>
  )
}
