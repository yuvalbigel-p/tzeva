import type { HarmonyType, WheelModel } from './color'

export type ViewMode = 'gradient' | 'segmented'

/** The one state object every component reads from. h: 0–360, s/b: 0–1 floats. */
export type State = {
  h: number
  s: number
  b: number
  mode: ViewMode
  wheel: WheelModel
  harmony: HarmonyType
}

export const INITIAL_STATE: State = {
  h: 210,
  s: 0.75,
  b: 1,
  mode: 'gradient',
  wheel: 'rgb',
  harmony: 'complementary',
}
