import { ColorRow } from './ColorRow'

type Props = {
  colors: string[]
  selectedHex: string
  onCopy: (hex: string) => void
  onDelete: (hex: string) => void
  onSelect: (hex: string) => void
}

/** Palette tab: saved colors, one row per color with a delete button. Scrolls within the view area. */
export function PaletteTab({ colors, selectedHex, onCopy, onDelete, onSelect }: Props) {
  if (colors.length === 0) {
    return <p className="palette-empty">No colors yet. Tap + on any color row to add it.</p>
  }
  return (
    <div className="palette-list">
      {colors.map((hex) => (
        <ColorRow
          key={hex}
          color={hex}
          hex={hex}
          onCopy={onCopy}
          onDelete={() => onDelete(hex)}
          onSelect={() => onSelect(hex)}
          selected={hex === selectedHex}
        >
          <span className="hex-text">{hex}</span>
        </ColorRow>
      ))}
    </div>
  )
}
