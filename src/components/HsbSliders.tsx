import { hsbToHex } from '../color'

type Props = {
  h: number
  s: number
  b: number
  onChange: (patch: { h?: number; s?: number; b?: number }) => void
}

const HUE_TRACK = `linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360]
  .map((h) => hsbToHex(h, 1, 1))
  .join(', ')})`

export function HsbSliders({ h, s, b, onChange }: Props) {
  const rows = [
    {
      key: 'h',
      label: 'Hue',
      value: h,
      max: 360,
      unit: '°',
      track: HUE_TRACK,
      set: (v: number) => onChange({ h: v }),
    },
    {
      key: 's',
      label: 'Saturation',
      value: s * 100,
      max: 100,
      unit: '%',
      track: `linear-gradient(to right, ${hsbToHex(h, 0, b)}, ${hsbToHex(h, 1, b)})`,
      set: (v: number) => onChange({ s: v / 100 }),
    },
    {
      key: 'b',
      label: 'Brightness',
      value: b * 100,
      max: 100,
      unit: '%',
      track: `linear-gradient(to right, ${hsbToHex(h, s, 0)}, ${hsbToHex(h, s, 1)})`,
      set: (v: number) => onChange({ b: v / 100 }),
    },
  ]

  return (
    <div className="sliders">
      {rows.map((r) => (
        <label key={r.key} className="slider-row">
          <span className="slider-label">{r.label}</span>
          <input
            type="range"
            min={0}
            max={r.max}
            step="any"
            value={r.value}
            style={{ ['--track' as string]: r.track }}
            onChange={(e) => r.set(e.currentTarget.valueAsNumber)}
          />
          <output className="slider-value">
            {Math.round(r.value)}
            {r.unit}
          </output>
        </label>
      ))}
    </div>
  )
}
