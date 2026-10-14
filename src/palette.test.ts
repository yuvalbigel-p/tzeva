import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadPalette, PALETTE_STORAGE_KEY, savePalette } from './palette'

/** Minimal in-memory localStorage, so these tests don't need a DOM/jsdom environment. */
class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() {
    return this.store.size
  }
  clear = () => this.store.clear()
  getItem = (key: string) => this.store.get(key) ?? null
  setItem = (key: string, value: string) => {
    this.store.set(key, value)
  }
  removeItem = (key: string) => {
    this.store.delete(key)
  }
  key = (i: number) => [...this.store.keys()][i] ?? null
}

let storage: MemoryStorage

beforeEach(() => {
  storage = new MemoryStorage()
  vi.stubGlobal('localStorage', storage)
})
afterEach(() => vi.unstubAllGlobals())

describe('loadPalette / savePalette', () => {
  it('round-trips a saved palette', () => {
    savePalette(['#FF0000', '#00FF00'])
    expect(loadPalette()).toEqual(['#FF0000', '#00FF00'])
  })

  it('saves with a version number', () => {
    savePalette(['#FF0000'])
    const stored = JSON.parse(storage.getItem(PALETTE_STORAGE_KEY)!)
    expect(stored).toEqual({ version: 1, colors: ['#FF0000'] })
  })

  it('starts empty when nothing is stored', () => {
    expect(loadPalette()).toEqual([])
  })

  it('starts empty on malformed JSON', () => {
    storage.setItem(PALETTE_STORAGE_KEY, '{not json')
    expect(loadPalette()).toEqual([])
  })

  it('starts empty on a version mismatch, instead of returning stale-format data', () => {
    storage.setItem(PALETTE_STORAGE_KEY, JSON.stringify({ version: 2, colors: ['#FF0000'] }))
    expect(loadPalette()).toEqual([])
  })

  it('starts empty when colors is not an array', () => {
    storage.setItem(PALETTE_STORAGE_KEY, JSON.stringify({ version: 1, colors: 'not-an-array' }))
    expect(loadPalette()).toEqual([])
  })

  it('drops non-string and invalid-hex entries but keeps the valid ones', () => {
    storage.setItem(
      PALETTE_STORAGE_KEY,
      JSON.stringify({ version: 1, colors: ['#FF0000', 123, '#GGGGGG', null, '#00FF00'] }),
    )
    expect(loadPalette()).toEqual(['#FF0000', '#00FF00'])
  })

  it('does not throw when storage.getItem throws', () => {
    storage.getItem = () => {
      throw new Error('blocked')
    }
    expect(() => loadPalette()).not.toThrow()
    expect(loadPalette()).toEqual([])
  })

  it('does not throw when storage.setItem throws (e.g. quota exceeded)', () => {
    storage.setItem = () => {
      throw new Error('quota exceeded')
    }
    expect(() => savePalette(['#FF0000'])).not.toThrow()
  })
})
