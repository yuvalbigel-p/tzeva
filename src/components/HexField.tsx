import { useState } from 'react'
import { ColorRow } from './ColorRow'

type Props = {
  hex: string
  /** Returns false if the text is not a valid hex color (state is left unchanged). */
  onApply: (text: string) => boolean
  onCopy: (hex: string) => void
  onAdd: (hex: string) => void
}

type Draft = { text: string; base: string; error: boolean }

/** Selected color's swatch row: editable hex with validation and a copy icon. */
export function HexField({ hex, onApply, onCopy, onAdd }: Props) {
  // A draft belongs to the hex it was typed against; once the color changes elsewhere it is ignored.
  const [draft, setDraft] = useState<Draft | null>(null)
  const active = draft && draft.base === hex ? draft : null

  const commit = () => {
    if (!active) return
    if (onApply(active.text)) setDraft(null)
    else setDraft({ ...active, error: true })
  }

  return (
    <ColorRow color={hex} hex={hex} onCopy={onCopy} onAdd={() => onAdd(hex)}>
      <input
        className="hex-input"
        value={active ? active.text : hex}
        aria-label="Hex color"
        aria-invalid={active?.error || undefined}
        inputMode="text"
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        maxLength={9}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setDraft({ text: e.currentTarget.value, base: hex, error: false })}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
      {active?.error && (
        <span className="hex-error" role="alert">
          Use #RRGGBB or #RGB
        </span>
      )}
    </ColorRow>
  )
}
