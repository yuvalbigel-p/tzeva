// Palette persistence. No UI code. There is only one palette (no names, no
// multiple palettes); it is stored versioned so the format can change later
// without losing what's saved.

import { parseHex } from './color'

export const PALETTE_STORAGE_KEY = 'tzeva.palette'
export const PALETTE_VERSION = 1

type StoredPalette = { version: number; colors: string[] }

function isStoredPalette(v: unknown): v is StoredPalette {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as StoredPalette).version === PALETTE_VERSION &&
    Array.isArray((v as StoredPalette).colors)
  )
}

/** Reads the saved palette. Missing or broken data (and any non-hex entries) are dropped silently. */
export function loadPalette(): string[] {
  try {
    const raw = localStorage.getItem(PALETTE_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!isStoredPalette(parsed)) return []
    return parsed.colors.filter((c): c is string => typeof c === 'string' && parseHex(c) !== null)
  } catch {
    return []
  }
}

/** Saves the palette. Failures (private mode, full storage, …) are ignored: the app keeps working in memory. */
export function savePalette(colors: string[]): void {
  try {
    const data: StoredPalette = { version: PALETTE_VERSION, colors }
    localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
}
