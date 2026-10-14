import { useCallback, useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { harmonies, hexToHsbKeepHue, hsbToHex, parseHex, rgbToHsb } from './color'
import { copyText } from './copy'
import { INITIAL_STATE, type State } from './state'
import { ColorWheel } from './components/ColorWheel'
import { HarmonyPicker, HarmonyRows } from './components/HarmonyPanel'
import { HexField } from './components/HexField'
import { HsbSliders } from './components/HsbSliders'
import { PaletteTab } from './components/PaletteTab'
import { Segmented } from './components/Segmented'
import { SettingsPopover } from './components/SettingsPopover'
import { WheelMarker, type WheelDot } from './components/WheelMarker'

type View = 'sliders' | 'harmonies' | 'palette'

export default function App() {
  const [st, setSt] = useState<State>(INITIAL_STATE)
  const [view, setView] = useState<View>('sliders')
  // Session only for now: Part 2 makes this persist across reloads.
  const [palette, setPalette] = useState<string[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef(0)
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  const hex = hsbToHex(st.h, st.s, st.b)
  const hues = harmonies(st.h, st.harmony, st.wheel)

  const patch = useCallback((p: Partial<State>) => setSt((prev) => ({ ...prev, ...p })), [])

  const showToast = useCallback((text: string) => {
    setToast(text)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 1200)
  }, [])

  const copy = useCallback(
    async (text: string) => {
      if (await copyText(text)) showToast('Copied')
    },
    [showToast],
  )
  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const applyHex = (text: string) => {
    const next = hexToHsbKeepHue(text, st)
    if (!next) return false
    patch(next)
    return true
  }

  // Selects a known-good hex (a palette color, or a harmony/dot's own color) as the current color.
  const selectHex = (hexValue: string) => {
    const next = hexToHsbKeepHue(hexValue, st)
    if (next) patch(next)
  }

  const addToPalette = (h: string) => {
    if (palette.includes(h)) {
      showToast('Already in palette')
      return
    }
    setPalette([...palette, h])
    showToast('Added to palette')
  }

  const harmonyDots: WheelDot[] = hues.map((hue, i) => ({
    key: i,
    h: hue,
    s: st.s,
    hex: hsbToHex(hue, st.s, st.b),
  }))
  const paletteDots: WheelDot[] = palette.flatMap((c) => {
    const rgb = parseHex(c)
    if (!rgb) return []
    const hsb = rgbToHsb(rgb.r, rgb.g, rgb.b)
    return [{ key: c, h: hsb.h, s: hsb.s, hex: c, selected: c === hex }]
  })
  const dots = view === 'harmonies' ? harmonyDots : view === 'palette' ? paletteDots : null

  const onPickDot = (key: string | number) => {
    if (view === 'harmonies') patch({ h: hues[key as number] })
    else if (view === 'palette') selectHex(key as string)
  }

  return (
    <div className="app">
      <SettingsPopover
        mode={st.mode}
        wheel={st.wheel}
        onMode={(mode) => patch({ mode })}
        onWheel={(wheel) => patch({ wheel })}
      />

      <div className="wheel-wrap">
        <ColorWheel b={st.b} mode={st.mode} wheel={st.wheel} />
        <WheelMarker state={st} dots={dots} onChange={(h, s) => patch({ h, s })} onPickDot={onPickDot} />
      </div>

      <HexField hex={hex} onApply={applyHex} onCopy={copy} onAdd={addToPalette} />

      <main className="view">
        {view === 'sliders' && <HsbSliders h={st.h} s={st.s} b={st.b} onChange={patch} />}
        {view === 'harmonies' && (
          <HarmonyRows
            hues={hues}
            s={st.s}
            b={st.b}
            onCopy={copy}
            onSelect={(i) => patch({ h: hues[i] })}
            onAdd={addToPalette}
          />
        )}
        {view === 'palette' && (
          <PaletteTab
            colors={palette}
            selectedHex={hex}
            onCopy={copy}
            onDelete={(c) => setPalette(palette.filter((x) => x !== c))}
            onSelect={selectHex}
          />
        )}
      </main>

      <footer className="bottom">
        {view === 'harmonies' && (
          <HarmonyPicker value={st.harmony} onChange={(harmony) => patch({ harmony })} />
        )}
        <Segmented
          label="View"
          value={view}
          onChange={setView}
          options={[
            { value: 'sliders', label: 'Sliders' },
            { value: 'harmonies', label: 'Harmonies' },
            { value: 'palette', label: 'Palette' },
          ]}
        />
      </footer>

      {needRefresh && (
        <button type="button" className="update-banner" onClick={() => updateServiceWorker(true)}>
          Update available, tap to reload
        </button>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
