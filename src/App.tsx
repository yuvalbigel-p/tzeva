import { useCallback, useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { harmonies, hexToHsbKeepHue, hsbToHex } from './color'
import { copyText } from './copy'
import { INITIAL_STATE, type State } from './state'
import { ColorWheel } from './components/ColorWheel'
import { HarmonyPicker, HarmonyRows } from './components/HarmonyPanel'
import { HexField } from './components/HexField'
import { HsbSliders } from './components/HsbSliders'
import { PaletteIcon } from './components/icons'
import { PalettePage } from './components/PalettePage'
import { Segmented } from './components/Segmented'
import { SettingsPopover } from './components/SettingsPopover'
import { WheelMarker } from './components/WheelMarker'

type View = 'sliders' | 'harmonies'
type Page = 'main' | 'palette'

export default function App() {
  const [st, setSt] = useState<State>(INITIAL_STATE)
  const [view, setView] = useState<View>('sliders')
  const [page, setPage] = useState<Page>('main')
  // Session only: never persisted, so a reload starts with an empty palette.
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

  const addToPalette = (h: string) => {
    if (palette.includes(h)) {
      showToast('Already in palette')
      return
    }
    setPalette([...palette, h])
    showToast('Added to palette')
  }

  const overlays = (
    <>
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
    </>
  )

  if (page === 'palette') {
    return (
      <div className="app">
        <PalettePage
          colors={palette}
          onBack={() => setPage('main')}
          onCopy={copy}
          onDelete={(h) => setPalette(palette.filter((c) => c !== h))}
        />
        {overlays}
      </div>
    )
  }

  return (
    <div className="app">
      <button
        type="button"
        className="icon-btn palette-btn"
        aria-label={`Palette, ${palette.length} ${palette.length === 1 ? 'color' : 'colors'}`}
        onClick={() => setPage('palette')}
      >
        <PaletteIcon />
        {palette.length > 0 && <span className="badge">{palette.length}</span>}
      </button>

      <SettingsPopover
        mode={st.mode}
        wheel={st.wheel}
        onMode={(mode) => patch({ mode })}
        onWheel={(wheel) => patch({ wheel })}
      />

      <div className="wheel-wrap">
        <ColorWheel b={st.b} mode={st.mode} wheel={st.wheel} />
        <WheelMarker
          state={st}
          dots={view === 'harmonies' ? hues : null}
          onChange={(h, s) => patch({ h, s })}
          onPickDot={(i) => patch({ h: hues[i] })}
        />
      </div>

      <HexField hex={hex} onApply={applyHex} onCopy={copy} onAdd={addToPalette} />

      <main className="view">
        {view === 'sliders' ? (
          <HsbSliders h={st.h} s={st.s} b={st.b} onChange={patch} />
        ) : (
          <HarmonyRows
            hues={hues}
            s={st.s}
            b={st.b}
            onCopy={copy}
            onSelect={(i) => patch({ h: hues[i] })}
            onAdd={addToPalette}
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
          ]}
        />
      </footer>

      {overlays}
    </div>
  )
}
