import { ColorRow } from './ColorRow'
import { BackIcon } from './icons'

type Props = {
  colors: string[]
  onBack: () => void
  onCopy: (hex: string) => void
  onDelete: (hex: string) => void
}

/** Second page: the session palette, one row per saved color with a delete button. */
export function PalettePage({ colors, onBack, onCopy, onDelete }: Props) {
  return (
    <>
      <header className="page-header">
        <button type="button" className="icon-btn" aria-label="Back to wheel" onClick={onBack}>
          <BackIcon />
        </button>
        <h1>Palette</h1>
      </header>

      {colors.length === 0 ? (
        <p className="palette-empty">No colors yet. Tap + on any color row to add it.</p>
      ) : (
        <main className="palette-list">
          {colors.map((hex) => (
            <ColorRow key={hex} color={hex} hex={hex} onCopy={onCopy} onDelete={() => onDelete(hex)}>
              <span className="hex-text">{hex}</span>
            </ColorRow>
          ))}
        </main>
      )}
    </>
  )
}
