import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { rgbToHex } from '../color'
import type { Photo } from '../loadPhoto'
import { average3x3, screenToImage } from '../photoColor'
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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const loupeRef = useRef<HTMLCanvasElement>(null)
  const imageDataRef = useRef<ImageData | null>(null)
  const lastHex = useRef<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loupePos, setLoupePos] = useState({ x: 0, y: 0 })
  const [hex, setHex] = useState('')

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

  const drawLoupe = (x: number, y: number) => {
    const ctx = loupeRef.current?.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE)
    const half = LOUPE_SAMPLE / 2
    ctx.drawImage(photo.canvas, x - half, y - half, LOUPE_SAMPLE, LOUPE_SAMPLE, 0, 0, LOUPE_SIZE, LOUPE_SIZE)
  }

  const update = (e: PointerEvent) => {
    const canvas = canvasRef.current
    const data = imageDataRef.current
    if (!canvas || !data) return
    const rect = canvas.getBoundingClientRect()
    const { x, y } = screenToImage(e.clientX, e.clientY, rect, photo.width, photo.height)
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
    update(e)
  }
  const onMove = (e: PointerEvent) => {
    if (dragging) update(e)
  }
  const onUp = () => {
    setDragging(false)
    if (lastHex.current) onPick(lastHex.current)
    onClose()
  }
  const onCancel = () => setDragging(false)

  const vw = typeof window === 'undefined' ? 0 : window.innerWidth
  const vh = typeof window === 'undefined' ? 0 : window.innerHeight
  const half = LOUPE_SIZE / 2
  const left = Math.min(vw - LOUPE_MARGIN - half, Math.max(LOUPE_MARGIN + half, loupePos.x))
  const above = loupePos.y - LOUPE_OFFSET - LOUPE_SIZE > 0
  const rawTop = above ? loupePos.y - LOUPE_OFFSET - LOUPE_SIZE : loupePos.y + LOUPE_OFFSET
  const top = Math.min(vh - LOUPE_MARGIN - LOUPE_SIZE, Math.max(LOUPE_MARGIN, rawTop))

  return (
    <div className="photo-view">
      <canvas
        ref={canvasRef}
        className="photo-canvas"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
      />
      <div className="photo-bar">
        <button type="button" className="icon-btn" aria-label="Close photo" onClick={onClose}>
          <CloseIcon />
        </button>
        <button type="button" className="icon-btn" aria-label="Choose a different photo" onClick={onChoosePhoto}>
          <PhotoIcon />
        </button>
      </div>
      {dragging && (
        <div className="loupe" style={{ left: `${left}px`, top: `${top}px` }}>
          <canvas ref={loupeRef} width={LOUPE_SIZE} height={LOUPE_SIZE} className="loupe-canvas" />
          <div className="loupe-crosshair" />
          <div className="loupe-hex">{hex}</div>
        </div>
      )}
    </div>
  )
}
