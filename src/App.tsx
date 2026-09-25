import { useCallback, useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { harmonies, hexToHsbKeepHue, hsbToHex } from './color'
import { copyText } from './copy'
import { INITIAL_STATE, type State } from './state'
import { ColorWheel } from './components/ColorWheel'
import { HarmonyPicker, HarmonyRows } from './components/HarmonyPanel'
import { HexField } from './components/HexField'
import { HsbSliders } from './components/HsbSliders'
import { Segmented } from './components/Segmented'
import { SettingsPopover } from './components/SettingsPopover'
import { WheelMarker } from './components/WheelMarker'

type View = 'sliders' | 'harmonies'

export default function App() {
  const [st, setSt] = useState<State>(INITIAL_STATE)
  const [view, setView] = useState<View>('sliders')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef(0)
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  const hex = hsbToHex(st.h, st.s, st.b)
  const hues = harmonies(st.h, st.harmony, st.wheel)

  const patch = useCallback((p: Partial<State>) => setSt((prev) => ({ ...prev, ...p })), [])

  const copy = useCallback(async (text: string) => {
    if (!(await copyText(text))) return
    setToast('Copied')
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 1200)
  }, [])
  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const applyHex = (text: string) => {
    const next = hexToHsbKeepHue(text, st)
    if (!next) return false
    patch(next)
    return true
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
        <WheelMarker
          state={st}
          dots={view === 'harmonies' ? hues : null}
          onChange={(h, s) => patch({ h, s })}
          onPickDot={(i) => patch({ h: hues[i] })}
        />
      </div>

      <HexField hex={hex} onApply={applyHex} onCopy={copy} />

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
