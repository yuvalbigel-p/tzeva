import { hsbToHex, type HarmonyType } from '../color'
import { ColorRow } from './ColorRow'

export const HARMONY_LABELS: Record<HarmonyType, string> = {
  complementary: 'Complementary',
  split: 'Split complementary',
  analogous: 'Analogous',
  triadic: 'Triadic',
  tetradic: 'Tetradic (square)',
}

type RowsProps = {
  hues: number[]
  s: number
  b: number
  onCopy: (hex: string) => void
  onSelect: (index: number) => void
}

/** One row per harmony color, styled like the main swatch row. */
export function HarmonyRows({ hues, s, b, onCopy, onSelect }: RowsProps) {
  return (
    <div className="harmony-rows">
      {hues.map((hue, i) => {
        const hex = hsbToHex(hue, s, b)
        return (
          <ColorRow key={i} color={hex} hex={hex} onCopy={onCopy} onSwatchLongPress={() => onSelect(i)}>
            <span className="hex-text">{hex}</span>
          </ColorRow>
        )
      })}
    </div>
  )
}

/** Dropdown pinned just above the Sliders | Harmonies control. */
export function HarmonyPicker({
  value,
  onChange,
}: {
  value: HarmonyType
  onChange: (v: HarmonyType) => void
}) {
  return (
    <select
      className="harmony-select"
      aria-label="Harmony"
      value={value}
      onChange={(e) => onChange(e.currentTarget.value as HarmonyType)}
    >
      {(Object.keys(HARMONY_LABELS) as HarmonyType[]).map((k) => (
        <option key={k} value={k}>
          {HARMONY_LABELS[k]}
        </option>
      ))}
    </select>
  )
}
