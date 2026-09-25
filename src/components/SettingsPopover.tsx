import { useEffect, useRef, useState } from 'react'
import type { WheelModel } from '../color'
import type { ViewMode } from '../state'
import { GearIcon } from './icons'
import { Segmented } from './Segmented'

type Props = {
  mode: ViewMode
  wheel: WheelModel
  onMode: (m: ViewMode) => void
  onWheel: (w: WheelModel) => void
}

/** Settings icon in the corner; the popover holds the only RGB/RYB and Gradient/Segmented toggles. */
export function SettingsPopover({ mode, wheel, onMode, onWheel }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div className="settings" ref={ref}>
      <button
        type="button"
        className="icon-btn settings-btn"
        aria-label="Wheel settings"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <GearIcon />
      </button>
      {open && (
        <div className="popover" role="dialog" aria-label="Wheel settings">
          <Segmented
            label="View mode"
            value={mode}
            onChange={onMode}
            options={[
              { value: 'gradient', label: 'Gradient' },
              { value: 'segmented', label: 'Segmented' },
            ]}
          />
          <Segmented
            label="Wheel model"
            value={wheel}
            onChange={onWheel}
            options={[
              { value: 'rgb', label: 'RGB' },
              { value: 'ryb', label: 'RYB' },
            ]}
          />
        </div>
      )}
    </div>
  )
}
